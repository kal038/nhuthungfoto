import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { PaymentPackagesResponse } from '@/types/payment'

export function usePaymentPackages() {
  return useAuthQuery<PaymentPackagesResponse>({
    queryKey: queryKeys.payments.packages(),
    queryFn: () => apiFetch<PaymentPackagesResponse>('/payments/packages'),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
}
