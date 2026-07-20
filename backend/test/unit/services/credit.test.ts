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

    it('throws 402 on insufficient credits', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { message: 'Insufficient credits' } 
      })
      
      await expect(spendCredits(mockSupabase as any, 'user-1', 10))
        .rejects
        .toThrowError(new AppError('Insufficient credits', 402))
    })

    it('throws 409 on idempotency key collision', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: null, 
        error: { code: '23505', message: 'duplicate key value violates unique constraint' } 
      })
      
      await expect(spendCredits(mockSupabase as any, 'user-1', 10, {}, 'duplicate-key'))
        .rejects
        .toThrowError(new AppError('Request already processed', 409))
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
