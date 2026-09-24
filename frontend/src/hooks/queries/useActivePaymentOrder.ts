import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { ActivePaymentOrderResponse, PaymentOrder } from '@/types/payment'
import type { UseQueryOptions } from '@tanstack/react-query'

async function fetchActiveOrder(): Promise<ActivePaymentOrderResponse> {
  return apiFetch<ActivePaymentOrderResponse>('/payments/active')
}

export function useActivePaymentOrder(
  options?: Partial<UseQueryOptions<ActivePaymentOrderResponse>>,
) {
  return useAuthQuery<ActivePaymentOrderResponse>({
    queryKey: queryKeys.payments.active(),
    queryFn: fetchActiveOrder,
    staleTime: 0, // always re-validate on mount
    retry: (count, error) => {
      if ('status' in error && typeof error.status === 'number' && error.status < 500) {
        return false
      }
      return count < 2
    },
    ...options,
  })
}

/** Convenience: unwrap `{ order }` into the order-or-null the UI cares about. */
export function useActivePaymentOrderOrNull(): PaymentOrder | null | undefined {
  const query = useActivePaymentOrder()
  return query.data?.order
}
