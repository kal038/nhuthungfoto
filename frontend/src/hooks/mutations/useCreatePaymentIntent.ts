import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type {
  ActivePaymentOrderResponse,
  CreatePaymentIntentResult,
  PaymentOrder,
} from '@/types/payment'

export type { PaymentOrderStatus } from '@/types/payment'

export interface CreatePaymentIntentInput {
  packageId: string
  clientRequestId: string
}

async function createPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<CreatePaymentIntentResult> {
  return apiFetch<CreatePaymentIntentResult>('/payments', {
    method: 'POST',
    body: input,
  })
}

export function useCreatePaymentIntentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPaymentIntent,
    onSuccess: (order) => {
      // The active query caches { order } — keep its shape for cache reads.
      queryClient.setQueryData<ActivePaymentOrderResponse>(queryKeys.payments.active(), { order })
      queryClient.setQueryData<PaymentOrder>(queryKeys.payments.status(order.id), order)
    },
  })
}
