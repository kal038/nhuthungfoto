import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { PaymentOrder } from '@/types/payment'

async function cancelPayment(orderId: string): Promise<PaymentOrder> {
  return apiFetch<PaymentOrder>(`/payments/${orderId}/cancel`, { method: 'POST' })
}

/**
 * Customer cancels before sending money: PENDING_TRANSFER → CANCELLED
 * (or EXPIRED when past the deadline — the RPC materializes it; terminal
 * states are idempotent no-ops).
 *
 * On success the response IS the new (terminal) order state: write it into
 * the status cache and clear the active-order entry — the UI then offers
 * package selection again.
 *
 * Errors pass through for the UI to map:
 * - 409: AWAITING_REVIEW (money already claimed; admin owns it now)
 * - 404: unknown / cross-user order
 */
export function useCancelPayment(orderId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!orderId) throw new Error('No active payment order to cancel')
      return cancelPayment(orderId)
    },
    onSuccess: (order) => {
      queryClient.setQueryData<PaymentOrder>(queryKeys.payments.status(order.id), order)
      queryClient.setQueryData<PaymentOrder | null>(queryKeys.payments.active(), null)
    },
  })
}
