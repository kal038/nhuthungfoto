import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'

export interface CreditBalance {
  balance: number
}

export interface CreditHistoryEntry {
  id: string
  amount: number
  type: 'PURCHASE' | 'SPEND' | 'REFUND' | 'STARTER_BONUS'
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface CreditHistoryResponse {
  entries: CreditHistoryEntry[]
  total: number
  limit: number
  offset: number
}

// ---------------------
// Balance
// ---------------------

async function fetchBalance(): Promise<number> {
  const res = await apiFetch<CreditBalance>('/credits/balance', undefined, 'GET')
  return res.balance
}

export function useCreditBalance() {
  return useAuthQuery<number>({
    queryKey: ['credits', 'balance'],
    queryFn: fetchBalance,
    staleTime: 30 * 1000, // 30s — balance can change frequently
  })
}

// ---------------------
// History
// ---------------------

async function fetchCreditHistory(
  limit: number = 20,
  offset: number = 0,
): Promise<CreditHistoryResponse> {
  return apiFetch<CreditHistoryResponse>(
    `/credits/history?limit=${limit}&offset=${offset}`,
    undefined,
    'GET',
  )
}

export function useCreditHistory(limit: number = 20, offset: number = 0) {
  return useAuthQuery<CreditHistoryResponse>({
    queryKey: ['credits', 'history', { limit, offset }],
    queryFn: () => fetchCreditHistory(limit, offset),
    staleTime: 60 * 1000, // 1 min
  })
}
