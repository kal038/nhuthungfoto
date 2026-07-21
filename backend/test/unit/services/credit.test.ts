import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spendCredits, addCredits, getBalance, getHistory } from '@/services/credit'
import { AppError } from '@/lib/errors'

describe('Credit Service', () => {
  const mockSupabase = {
    rpc: vi.fn(),
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('spendCredits', () => {
    it('calls spend_credits RPC successfully', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: 9, error: null })
      
      const newBalance = await spendCredits(mockSupabase as any, 'user-1', 1, { sub_id: 'sub-1' }, 'key-1')
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('spend_credits', {
        p_user_id: 'user-1',
        p_amount: 1,
        p_type: 'SPEND',
        p_metadata: { sub_id: 'sub-1' },
        p_idempotency_key: 'key-1',
      })
      expect(newBalance).toBe(9)
    })

    it('throws 402 on insufficient credits (23514 check_violation)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '23514', message: 'Insufficient credits' }
      })

      await expect(spendCredits(mockSupabase as any, 'user-1', 10))
        .rejects
        .toThrowError(new AppError('Insufficient credits', 402))
    })

    it('throws 409 on idempotency key collision (23505 unique_violation)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' }
      })

      await expect(spendCredits(mockSupabase as any, 'user-1', 10, {}, 'duplicate-key'))
        .rejects
        .toThrowError(new AppError('Request already processed', 409))
    })

    it('throws 403 on unauthorized (42501 insufficient_privilege)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'Unauthorized' }
      })

      await expect(spendCredits(mockSupabase as any, 'user-1', 10))
        .rejects
        .toThrowError(new AppError('Unauthorized', 403))
    })

    it('throws 400 on non-positive amount (22023 invalid_parameter_value)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '22023', message: 'Amount must be positive' }
      })

      await expect(spendCredits(mockSupabase as any, 'user-1', 0))
        .rejects
        .toThrowError(new AppError('Amount must be positive', 400))
    })

    it('throws 500 on generic error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'DB Down' }
      })

      await expect(spendCredits(mockSupabase as any, 'user-1', 10))
        .rejects
        .toThrowError(new AppError('Failed to spend credits', 500))
    })
  })

  describe('addCredits', () => {
    it('calls add_credits RPC successfully', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: 20, error: null })
      
      const newBalance = await addCredits(mockSupabase as any, 'user-1', 10, 'PURCHASE', null, 'key-2')
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_credits', {
        p_user_id: 'user-1',
        p_amount: 10,
        p_type: 'PURCHASE',
        p_metadata: null,
        p_idempotency_key: 'key-2',
      })
      expect(newBalance).toBe(20)
    })

    it('throws 403 on unauthorized (42501 insufficient_privilege)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'Unauthorized' }
      })

      await expect(addCredits(mockSupabase as any, 'user-1', 10))
        .rejects
        .toThrowError(new AppError('Unauthorized', 403))
    })

    it('throws 400 on non-positive amount (22023 invalid_parameter_value)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '22023', message: 'Amount must be positive' }
      })

      await expect(addCredits(mockSupabase as any, 'user-1', -5))
        .rejects
        .toThrowError(new AppError('Amount must be positive', 400))
    })

    it('throws 404 on user not found (P0002 no_data_found)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: 'P0002', message: 'User not found' }
      })

      await expect(addCredits(mockSupabase as any, 'missing-user', 10))
        .rejects
        .toThrowError(new AppError('User not found', 404))
    })

    it('throws 409 on idempotency key collision (23505 unique_violation)', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' }
      })

      await expect(addCredits(mockSupabase as any, 'user-1', 10, 'PURCHASE', null, 'duplicate-key'))
        .rejects
        .toThrowError(new AppError('Request already processed', 409))
    })
  })

  describe('getHistory', () => {
    it('selects explicit columns and paginates', async () => {
      const entry = { id: 'h-1', amount: 10, type: 'STARTER_BONUS', metadata: null, created_at: '2026-07-21' }
      const mockRange = vi.fn().mockResolvedValue({ data: [entry], error: null, count: 1 })
      const mockOrder = vi.fn().mockReturnValue({ range: mockRange })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const result = await getHistory(mockSupabase as any, 'user-1', 10, 5)

      expect(mockSupabase.from).toHaveBeenCalledWith('credit_history')
      expect(mockSelect).toHaveBeenCalledWith('id, amount, type, metadata, created_at', { count: 'exact' })
      expect(mockRange).toHaveBeenCalledWith(5, 14)
      expect(result).toEqual({ entries: [entry], total: 1 })
    })
  })

  describe('getBalance', () => {
    it('returns balance successfully', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { credits_balance: 15 }, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from.mockReturnValue({ select: mockSelect })

      const balance = await getBalance(mockSupabase as any, 'user-1')
      expect(balance).toBe(15)
    })
  })
})
