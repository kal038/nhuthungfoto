import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelOrder,
  confirmOrder,
  createOrder,
  generateOrderCode,
  getOrderByUser,
} from '@/services/payments'
import { ORDER_CODE_ALPHABET } from '@/config/payment'

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