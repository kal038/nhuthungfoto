import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { PaymentOrder, PaymentOrderStatus } from '@/types/payment'

const TERMINAL_STATUSES: readonly PaymentOrderStatus[] = ['SUCCESS', 'CANCELLED', 'EXPIRED']

async function fetchPaymentStatus(orderId: string): Promise<PaymentOrder> {
  return apiFetch<PaymentOrder>(`/payments/${orderId}/status`)
}

export function usePaymentStatus(orderId: string | null) {
  const queryClient = useQueryClient()

  const query = useAuthQuery<PaymentOrder>({
    queryKey: queryKeys.payments.status(orderId),
    queryFn: () => fetchPaymentStatus(orderId as string),
    enabled: orderId !== null,
    staleTime: 0,
    // don't have to retch terminals
    refetchOnWindowFocus: (q) => {
      const status = q.state.data?.status
      return !(status && TERMINAL_STATUSES.includes(status))
    },
    refetchOnReconnect: true,
  })

  const isTerminal = query.data ? TERMINAL_STATUSES.includes(query.data.status) : false

  // Credits granted exactly once on approval — refresh balance + history.
  useEffect(() => {
    if (query.data?.status === 'SUCCESS') {
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.balance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.histories() })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.active() })
    }
  }, [query.data?.status, queryClient])

  return { ...query, isTerminal }
}
