import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { PaymentStatusResult } from '@/hooks/queries/usePaymentStatus'

export type PaymentOrderStatus =
  | 'PENDING_TRANSFER'
  | 'AWAITING_REVIEW'
  | 'SUCCESS'
  | 'CANCELLED'
  | 'EXPIRED'

export interface CreatePaymentIntentInput {
  packageId: string
  /**
   * Client-generated idempotency key — ONE per purchase intent.
   * The caller owns it: generate on intent start, persist (active order
   * storage), and RE-SEND the same value on network retries so the backend
   * returns the existing order instead of creating a duplicate.
   * New token only after the previous order reached a terminal state.
   */
  clientRequestId: string
}

/** Mirrors the backend CreateOrderResponse (routes/payments.ts). */
export interface CreatePaymentIntentResult {
  id: string
  orderCode: string
  packageId: string
  packageLabel: string
  creditAmount: number
  amountVnd: number
  status: PaymentOrderStatus
  expiresAt: string
  transferMessage: string
  qrUrl: string
}

async function createPaymentIntent(
  input: CreatePaymentIntentInput,
): Promise<CreatePaymentIntentResult> {
  return apiFetch<CreatePaymentIntentResult>('/payments', {
    method: 'POST',
    body: input,
  })
}

/**
 * Mutation to create (or idempotently reuse) a manual payment order.
 *
 * Nothing to invalidate on success:
 * - credits balance/history unchanged (no money moved yet, nothing granted)
 * - the new order's status query key doesn't exist in the cache yet
 *
 * Instead, seed the payment status key with the create response so
 * usePaymentStatus renders instantly instead of flashing a first-poll spinner.
 *
 * TODO(activePaymentOrder): also persist {orderId, clientRequestId, createdAt}
 * to the active-order storage on success, and clear it on terminal status.
 */
export function useCreatePaymentIntentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createPaymentIntent,
    onSuccess: (order) => {
      queryClient.setQueryData<PaymentStatusResult>(queryKeys.payments.status(order.id), {
        ...order,
        confirmedAt: null, // not confirmed yet at creation
        resolvedAt: null,
      })
    },
  })
}
