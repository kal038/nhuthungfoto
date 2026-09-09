import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppError } from '@/lib/errors'
import { createOrder } from '@/services/payments'
import type { Database } from '@/types/database.types'

const order = {
  id: 'b2e87cba-8045-4d79-ac0b-056b21be1f39',
  user_id: 'user-1',
  client_request_id: 'request-123',
  package_id: 'trial',
  package_label: 'Trải nghiệm',
  credit_amount: 3,
  amount_vnd: 99_000,
  order_code: 'ABCDEFG',
  status: 'PENDING_TRANSFER' as const,
  expires_at: '2026-09-05T12:30:00.000Z',
  confirmed_at: null,
  telegram_notification_status: null,
  telegram_notified_at: null,
  approval_metadata: null,
  created_at: '2026-09-05T12:00:00.000Z',
  resolved_at: null,
}

describe('Payment Service', () => {
  const rpc = vi.fn()
  const supabase = { rpc } as unknown as SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns an order after one successful RPC call', async () => {
    rpc.mockResolvedValue({ data: order, error: null })

    const result = await createOrder(supabase, 'user-1', {
      packageId: 'trial',
      clientRequestId: 'request-123',
    })

    expect(result.order).toEqual(order)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('returns a retryable conflict for any unique violation', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: '23505',
        message:
          'duplicate key value violates unique constraint "payment_orders_user_client_request_unique"',
        details: 'Key (user_id, client_request_id) already exists.',
      },
    })

    await expect(
      createOrder(supabase, 'user-1', {
        packageId: 'trial',
        clientRequestId: 'request-123',
      }),
    ).rejects.toEqual(new AppError('Could not create payment order; please try again', 409))

    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('rejects a successful RPC response with no order', async () => {
    rpc.mockResolvedValue({ data: null, error: null })

    await expect(
      createOrder(supabase, 'user-1', {
        packageId: 'trial',
        clientRequestId: 'request-123',
      }),
    ).rejects.toEqual(new AppError('Failed to create payment order', 500))

    expect(rpc).toHaveBeenCalledTimes(1)
  })
})
