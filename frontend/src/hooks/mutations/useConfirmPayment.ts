import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { ActivePaymentOrderResponse, PaymentOrder } from '@/types/payment'

async function confirmPayment(orderId: string): Promise<PaymentOrder> {
  return apiFetch<PaymentOrder>(`/payments/${orderId}/confirm`, { method: 'POST' })
}

/**
 * Customer confirms the bank transfer: PENDING_TRANSFER → AWAITING_REVIEW.
 * Idempotent server-side — a repeat call returns the row unchanged.
 *
 * On success the response IS the new order state: write it straight into the
 * status cache (usePaymentStatus renders it instantly, polling continues) and
 * refresh the active-order entry (still active, but now AWAITING_REVIEW).
 *
 * Errors pass through for the UI to map:
 * - 409: past deadline (order effectively EXPIRED) or already resolved
 * - 404: unknown / cross-user order
 */
export function useConfirmPayment(orderId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!orderId) throw new Error('No active payment order to confirm')
      return confirmPayment(orderId)
    },
    onSuccess: (order) => {
      queryClient.setQueryData<PaymentOrder>(queryKeys.payments.status(order.id), order)
      // The active query caches { order } — keep its shape for cache reads.
      queryClient.setQueryData<ActivePaymentOrderResponse>(queryKeys.payments.active(), { order })
    },
  })
}
