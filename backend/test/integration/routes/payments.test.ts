import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AuthVars } from '@/middleware/auth'
import { paymentsRouter } from '@/routes/payments'
import type { Env } from '@/types/env'
import { AppError } from '@/lib/errors'
import { createOrder, getOrderByUser } from '@/services/payments'
import { buildVietQrUrl } from '@/config/payment'

vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(() => ({})),
}))

vi.mock('@/services/payments', () => ({
  createOrder: vi.fn(),
  getOrderByUser: vi.fn(),
}))

const fakeOrderRow = {
  id: 'order-1',
  order_code: 'ABC2345',
  package_id: 'practice',
  package_label: 'Luyện tập',
  credit_amount: 12,
  amount_vnd: 349_000,
  status: 'PENDING_TRANSFER' as const,
  expires_at: '2026-09-09T10:00:00.000Z',
}

const fakeViewRow = {
  ...fakeOrderRow,
  effective_status: 'EXPIRED' as const, // stale PENDING_TRANSFER past its deadline
  confirmed_at: null,
  resolved_at: null,
}

describe('Payment Routes', () => {
  let app: Hono<{ Bindings: Env; Variables: { user: AuthVars } }>

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()
    app.use('*', async (c, next) => {
      c.set('user', { id: 'user-123', role: 'authenticated' })
      await next()
    })
    app.onError((err, c) => {
      if (err instanceof AppError) {
        return c.json({ error: err.message }, err.status as ContentfulStatusCode)
      }
      return c.json({ error: 'Internal Server Error' }, 500)
    })
    app.route('/v1/payments', paymentsRouter)
  })

  it('returns enabled package fields without internal flags', async () => {
    const response = await app.request('/v1/payments/packages')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      packages: [
        {
          id: 'trial',
          label: 'Trải nghiệm',
          credits: 3,
          amountVnd: 99_000,
          isPopular: false,
        },
        {
          id: 'practice',
          label: 'Luyện tập',
          credits: 12,
          amountVnd: 349_000,
          isPopular: true,
        },
        {
          id: 'progress',
          label: 'Tiến bộ',
          credits: 30,
          amountVnd: 749_000,
          isPopular: false,
        },
      ],
    })
  })

  describe('POST /v1/payments', () => {
    it('creates an order and maps the row to camelCase', async () => {
      vi.mocked(createOrder).mockResolvedValue({
        order: fakeOrderRow as never,
        transferMessage: fakeOrderRow.order_code,
        qrUrl: 'https://img.vietqr.io/image/x-y-compact2.png?amount=349000',
      })

      const response = await app.request('/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: 'practice', clientRequestId: 'retry-token-1' }),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        id: 'order-1',
        orderCode: 'ABC2345',
        packageId: 'practice',
        packageLabel: 'Luyện tập',
        creditAmount: 12,
        amountVnd: 349_000,
        status: 'PENDING_TRANSFER',
        expiresAt: '2026-09-09T10:00:00.000Z',
        transferMessage: 'ABC2345',
        qrUrl: 'https://img.vietqr.io/image/x-y-compact2.png?amount=349000',
      })
      expect(createOrder).toHaveBeenCalledWith(
        {},
        'user-123',
        { packageId: 'practice', clientRequestId: 'retry-token-1' },
      )
    })

    it('rejects an unknown package id', async () => {
      const response = await app.request('/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: 'bogus', clientRequestId: 'retry-token-1' }),
      })

      expect(response.status).toBe(400)
      expect(createOrder).not.toHaveBeenCalled()
    })

    it('rejects a non-JSON body', async () => {
      const response = await app.request('/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })

      expect(response.status).toBe(400)
      expect(createOrder).not.toHaveBeenCalled()
    })
  })

  describe('GET /v1/payments/:orderId/status', () => {
    it('returns the deadline-aware effective status', async () => {
      vi.mocked(getOrderByUser).mockResolvedValue(fakeViewRow as never)

      const response = await app.request(
        '/v1/payments/0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11/status',
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        id: 'order-1',
        orderCode: 'ABC2345',
        status: 'EXPIRED', // effective_status wins over physical status
        packageLabel: 'Luyện tập',
        creditAmount: 12,
        amountVnd: 349_000,
        confirmedAt: null,
        expiresAt: '2026-09-09T10:00:00.000Z',
        resolvedAt: null,
        transferMessage: 'ABC2345',
        qrUrl: buildVietQrUrl(349_000, 'ABC2345'),
      })
    })

    it('rejects a malformed order id', async () => {
      const response = await app.request('/v1/payments/not-a-uuid/status')

      expect(response.status).toBe(400)
      expect(getOrderByUser).not.toHaveBeenCalled()
    })

    it('passes through a missing/cross-user 404', async () => {
      vi.mocked(getOrderByUser).mockRejectedValue(new AppError('Order not found', 404))

      const response = await app.request(
        '/v1/payments/0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11/status',
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Order not found')
    })
  })

  describe('POST /v1/payments/:orderId/confirm and /cancel', () => {
    const uuid = '0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11'

    it('confirm responds 501 until lifecycle RPCs ship', async () => {
      const response = await app.request(`/v1/payments/${uuid}/confirm`, { method: 'POST' })
      const data = await response.json()

      expect(response.status).toBe(501)
      expect(data.error).toContain('lifecycle RPCs')
    })

    it('cancel responds 501 until lifecycle RPCs ship', async () => {
      const response = await app.request(`/v1/payments/${uuid}/cancel`, { method: 'POST' })
      const data = await response.json()

      expect(response.status).toBe(501)
      expect(data.error).toContain('lifecycle RPCs')
    })

    it('confirm rejects a malformed order id', async () => {
      const response = await app.request('/v1/payments/not-a-uuid/confirm', { method: 'POST' })

      expect(response.status).toBe(400)
    })
  })
})