import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  approveOrder,
  cancelOrder,
  confirmOrder,
  createOrder,
  generateOrderCode,
  getOrderByUser,
  rejectOrder,
} from '@/services/payments'
import { ORDER_CODE_ALPHABET } from '@/config/payment'
import { sendPaymentReviewNotification } from '@/services/telegram'

vi.mock('@/services/telegram', () => ({
  sendPaymentReviewNotification: vi.fn(),
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

describe('generateOrderCode', () => {
  it('produces a 7-char code from the unambiguous alphabet', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateOrderCode()
      expect(code).toHaveLength(7)
      for (const char of code) {
        expect(ORDER_CODE_ALPHABET).toContain(char)
      }
    }
  })
})

describe('createOrder', () => {
  const rpc = vi.fn()
  const supabase = { rpc } as never

  beforeEach(() => {
    rpc.mockReset()
  })

  it('rejects an unknown package with 400', async () => {
    await expect(
      createOrder(supabase, 'user-1', { packageId: 'bogus', clientRequestId: 'token-123' }),
    ).rejects.toMatchObject({ status: 400 })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('snapshots the server package and calls the RPC', async () => {
    rpc.mockResolvedValue({ data: fakeOrderRow, error: null })

    const result = await createOrder(supabase, 'user-1', {
      packageId: 'practice',
      clientRequestId: 'token-123',
    })

    expect(rpc).toHaveBeenCalledTimes(1)
    const [name, args] = rpc.mock.calls[0]
    expect(name).toBe('create_manual_payment_order')
    expect(args.p_user_id).toBe('user-1')
    expect(args.p_client_request_id).toBe('token-123')
    // Snapshot comes from the server catalog, never the client.
    expect(args.p_package_snapshot).toEqual({
      id: 'practice',
      label: 'Luyện tập',
      credits: 12,
      amountVnd: 349_000,
    })
    expect(args.p_order_code).toMatch(/^[A-Z0-9]{7}$/)
    // Server-owned expiry: ~30 minutes out.
    const delta = Date.parse(args.p_expires_at) - Date.now()
    expect(delta).toBeGreaterThan(29 * 60_000)
    expect(delta).toBeLessThan(31 * 60_000)

    expect(result).toEqual(fakeOrderRow)
  })

  it('maps a unique violation to 409', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })

    await expect(
      createOrder(supabase, 'user-1', { packageId: 'practice', clientRequestId: 'token-123' }),
    ).rejects.toMatchObject({ status: 409 })
  })

  it('maps invalid parameter / check violations to 400', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'bad input' } })
    await expect(
      createOrder(supabase, 'user-1', { packageId: 'practice', clientRequestId: 'token-123' }),
    ).rejects.toMatchObject({ status: 400 })

    rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'check failed' } })
    await expect(
      createOrder(supabase, 'user-1', { packageId: 'practice', clientRequestId: 'token-123' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  it('maps anything else to 500', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })
    await expect(
      createOrder(supabase, 'user-1', { packageId: 'practice', clientRequestId: 'token-123' }),
    ).rejects.toMatchObject({ status: 500 })
  })

  it('throws 500 when the RPC returns no order', async () => {
    rpc.mockResolvedValue({ data: null, error: null })

    await expect(
      createOrder(supabase, 'user-1', { packageId: 'practice', clientRequestId: 'token-123' }),
    ).rejects.toMatchObject({ status: 500 })
  })
})

describe('getOrderByUser', () => {
  const maybeSingle = vi.fn()
  const eqUserId = vi.fn(() => ({ maybeSingle }))
  const eqId = vi.fn(() => ({ eq: eqUserId }))
  const select = vi.fn(() => ({ eq: eqId }))
  const from = vi.fn(() => ({ select }))
  const supabase = { from } as never

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads via the effective view and filters by id + user', async () => {
    const viewRow = { ...fakeOrderRow, effective_status: 'EXPIRED', confirmed_at: null, resolved_at: null }
    maybeSingle.mockResolvedValue({ data: viewRow, error: null })

    const result = await getOrderByUser(supabase, 'user-1', 'order-1')

    expect(from).toHaveBeenCalledWith('payment_orders_effective')
    expect(select).toHaveBeenCalledWith('*')
    expect(eqId).toHaveBeenCalledWith('id', 'order-1')
    expect(eqUserId).toHaveBeenCalledWith('user_id', 'user-1')
    expect(maybeSingle).toHaveBeenCalled()
    expect(result).toEqual(viewRow)
  })

  it('throws 404 when the order is missing or cross-user', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(getOrderByUser(supabase, 'user-1', 'order-1')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('throws 500 on a database error', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })

    await expect(getOrderByUser(supabase, 'user-1', 'order-1')).rejects.toMatchObject({
      status: 500,
    })
  })
})

describe('confirmOrder', () => {
  const rpc = vi.fn()
  const supabase = { rpc } as never

  beforeEach(() => {
    rpc.mockReset()
  })

  it('calls the RPC with owner scoping and returns the moved order', async () => {
    const moved = { ...fakeOrderRow, status: 'AWAITING_REVIEW' as const, confirmed_at: null }
    rpc.mockResolvedValue({ data: moved, error: null })

    const result = await confirmOrder(supabase, 'user-1', 'order-1')

    expect(rpc).toHaveBeenCalledWith('confirm_manual_payment_order', {
      p_user_id: 'user-1',
      p_order_id: 'order-1',
    })
    expect(result).toEqual(moved)
  })

  it('maps no_data_found to 404', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'not found' } })

    await expect(confirmOrder(supabase, 'user-1', 'order-1')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('maps wrong-state / deadline-miss to 409', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '55000', message: 'bad state' } })

    await expect(confirmOrder(supabase, 'user-1', 'order-1')).rejects.toMatchObject({
      status: 409,
    })
  })

  it('throws 500 when the RPC returns no order', async () => {
    rpc.mockResolvedValue({ data: null, error: null })

    await expect(confirmOrder(supabase, 'user-1', 'order-1')).rejects.toMatchObject({
      status: 500,
    })
  })

  describe('with Telegram delivery', () => {
    const env = { TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_ID: '123' } as never
    const deliverable = {
      ...fakeOrderRow,
      status: 'AWAITING_REVIEW' as const,
      confirmed_at: '2026-10-06T10:00:00.000Z',
      telegram_notification_status: 'PENDING' as const,
    }

    beforeEach(() => {
      vi.mocked(sendPaymentReviewNotification).mockReset()
    })

    it('claims the send, records SENT after delivery, and returns the updated status', async () => {
      rpc.mockImplementation(async (name: string) => {
        if (name === 'confirm_manual_payment_order') return { data: deliverable, error: null }
        if (name === 'claim_telegram_notification') return { data: true, error: null }
        if (name === 'update_telegram_notification_status') return { data: null, error: null }
        throw new Error(`unexpected rpc: ${name}`)
      })
      vi.mocked(sendPaymentReviewNotification).mockResolvedValueOnce({ messageId: 1, chatId: 123 })

      const result = await confirmOrder(supabase, 'user-1', 'order-1', env)

      expect(result.telegram_notification_status).toBe('SENT')
      expect(rpc).toHaveBeenCalledWith('claim_telegram_notification', { p_order_id: 'order-1' })
      expect(rpc).toHaveBeenCalledWith('update_telegram_notification_status', {
        p_order_id: 'order-1',
        p_status: 'SENT',
      })
    })

    it('does not send when the claim is lost (parallel confirm / already sent)', async () => {
      rpc.mockImplementation(async (name: string) => {
        if (name === 'confirm_manual_payment_order') return { data: deliverable, error: null }
        if (name === 'claim_telegram_notification') return { data: false, error: null }
        return { data: null, error: null }
      })

      const result = await confirmOrder(supabase, 'user-1', 'order-1', env)

      expect(result).toEqual(deliverable)
      expect(sendPaymentReviewNotification).not.toHaveBeenCalled()
      expect(rpc).not.toHaveBeenCalledWith(
        'update_telegram_notification_status',
        expect.anything(),
      )
    })

    it('throws 502 without sending when the claim RPC fails', async () => {
      rpc.mockImplementation(async (name: string) => {
        if (name === 'confirm_manual_payment_order') return { data: deliverable, error: null }
        if (name === 'claim_telegram_notification')
          return { data: null, error: { code: 'XX000', message: 'boom' } }
        return { data: null, error: null }
      })

      await expect(confirmOrder(supabase, 'user-1', 'order-1', env)).rejects.toMatchObject({
        status: 502,
      })
      expect(sendPaymentReviewNotification).not.toHaveBeenCalled()
    })

    it('retries the SENT write and succeeds on a later attempt', async () => {
      let statusCalls = 0
      rpc.mockImplementation(async (name: string) => {
        if (name === 'confirm_manual_payment_order') return { data: deliverable, error: null }
        if (name === 'claim_telegram_notification') return { data: true, error: null }
        if (name === 'update_telegram_notification_status') {
          statusCalls++
          return statusCalls === 1
            ? { data: null, error: { code: 'XX000', message: 'transient' } }
            : { data: null, error: null }
        }
        throw new Error(`unexpected rpc: ${name}`)
      })
      vi.mocked(sendPaymentReviewNotification).mockResolvedValueOnce({ messageId: 1, chatId: 123 })

      const result = await confirmOrder(supabase, 'user-1', 'order-1', env)

      expect(result.telegram_notification_status).toBe('SENT')
      expect(statusCalls).toBe(2)
    })

    it('surfaces a retryable 502 after exhausting SENT write attempts', async () => {
      let statusCalls = 0
      rpc.mockImplementation(async (name: string) => {
        if (name === 'confirm_manual_payment_order') return { data: deliverable, error: null }
        if (name === 'claim_telegram_notification') return { data: true, error: null }
        if (name === 'update_telegram_notification_status') {
          statusCalls++
          return { data: null, error: { code: 'XX000', message: 'boom' } }
        }
        throw new Error(`unexpected rpc: ${name}`)
      })
      vi.mocked(sendPaymentReviewNotification).mockResolvedValueOnce({ messageId: 1, chatId: 123 })

      await expect(confirmOrder(supabase, 'user-1', 'order-1', env)).rejects.toMatchObject({
        status: 502,
      })
      expect(statusCalls).toBe(3)
    })

    it('records FAILED (releasing the claim) and throws 502 when delivery fails', async () => {
      rpc.mockImplementation(async (name: string) => {
        if (name === 'confirm_manual_payment_order') return { data: deliverable, error: null }
        if (name === 'claim_telegram_notification') return { data: true, error: null }
        if (name === 'update_telegram_notification_status') return { data: null, error: null }
        throw new Error(`unexpected rpc: ${name}`)
      })
      vi.mocked(sendPaymentReviewNotification).mockRejectedValueOnce(new Error('network down'))

      await expect(confirmOrder(supabase, 'user-1', 'order-1', env)).rejects.toMatchObject({
        status: 502,
      })
      expect(rpc).toHaveBeenCalledWith('update_telegram_notification_status', {
        p_order_id: 'order-1',
        p_status: 'FAILED',
      })
    })
  })
})

describe('cancelOrder', () => {
  const rpc = vi.fn()
  const supabase = { rpc } as never

  beforeEach(() => {
    rpc.mockReset()
  })

  it('calls the RPC with owner scoping and returns the cancelled order', async () => {
    const cancelled = { ...fakeOrderRow, status: 'CANCELLED' as const, resolved_at: null }
    rpc.mockResolvedValue({ data: cancelled, error: null })

    const result = await cancelOrder(supabase, 'user-1', 'order-1')

    expect(rpc).toHaveBeenCalledWith('cancel_manual_payment_order', {
      p_user_id: 'user-1',
      p_order_id: 'order-1',
    })
    expect(result).toEqual(cancelled)
  })

  it('maps no_data_found to 404', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'not found' } })

    await expect(cancelOrder(supabase, 'user-1', 'order-1')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('maps AWAITING_REVIEW rejection to 409', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '55000', message: 'awaiting review' } })

    await expect(cancelOrder(supabase, 'user-1', 'order-1')).rejects.toMatchObject({
      status: 409,
    })
  })

  it('throws 500 when the RPC returns no order', async () => {
    rpc.mockResolvedValue({ data: null, error: null })

    await expect(cancelOrder(supabase, 'user-1', 'order-1')).rejects.toMatchObject({
      status: 500,
    })
  })
})

describe('approveOrder', () => {
  const rpc = vi.fn()
  const supabase = { rpc } as never

  beforeEach(() => {
    rpc.mockReset()
  })

  it('calls approve_manual_payment_order RPC and returns the approved order', async () => {
    const approved = { ...fakeOrderRow, status: 'SUCCESS' as const, resolved_at: '2026-10-06T10:00:00Z' }
    rpc.mockResolvedValue({ data: approved, error: null })

    const result = await approveOrder(supabase, 'order-1', { method: 'telegram' })

    expect(rpc).toHaveBeenCalledWith('approve_manual_payment_order', {
      p_order_id: 'order-1',
      p_approval_metadata: { method: 'telegram' },
    })
    expect(result).toEqual(approved)
  })

  it('maps no_data_found to 404', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'not found' } })

    await expect(approveOrder(supabase, 'order-1')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('maps state conflict to 409', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '55000', message: 'not awaiting review' } })

    await expect(approveOrder(supabase, 'order-1')).rejects.toMatchObject({
      status: 409,
    })
  })
})

describe('rejectOrder', () => {
  const rpc = vi.fn()
  const supabase = { rpc } as never

  beforeEach(() => {
    rpc.mockReset()
  })

  it('calls reject_manual_payment_order RPC and returns the cancelled order', async () => {
    const rejected = { ...fakeOrderRow, status: 'CANCELLED' as const, resolved_at: '2026-10-06T10:00:00Z' }
    rpc.mockResolvedValue({ data: rejected, error: null })

    const result = await rejectOrder(supabase, 'order-1', { method: 'telegram' })

    expect(rpc).toHaveBeenCalledWith('reject_manual_payment_order', {
      p_order_id: 'order-1',
      p_approval_metadata: { method: 'telegram' },
    })
    expect(result).toEqual(rejected)
  })

  it('maps no_data_found to 404', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0002', message: 'not found' } })

    await expect(rejectOrder(supabase, 'order-1')).rejects.toMatchObject({
      status: 404,
    })
  })

  it('maps state conflict to 409', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '55000', message: 'not awaiting review' } })

    await expect(rejectOrder(supabase, 'order-1')).rejects.toMatchObject({
      status: 409,
    })
  })
})