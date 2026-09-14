import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { PaymentOrderStatus } from '@/hooks/mutations/useCreatePaymentIntent'

/** Mirrors the backend OrderStatusResponse (routes/payments.ts). */
export interface PaymentStatusResult {
  id: string
  orderCode: string
  status: PaymentOrderStatus
  packageLabel: string
  creditAmount: number
  amountVnd: number
  confirmedAt: string | null
  expiresAt: string
  resolvedAt: string | null
  transferMessage: string
  qrUrl: string
}

const TERMINAL_STATUSES: readonly PaymentOrderStatus[] = [
  'SUCCESS',
  'CANCELLED',
  'EXPIRED',
]
const FAST_POLL_MS = 3_000 // active window: user is watching the QR
const FAST_WINDOW_MS = 90_000
const SLOW_POLL_MS = 15_000 // past the window: passive waiting

async function fetchPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
  return apiFetch<PaymentStatusResult>(`/payments/${orderId}/status`)
}

/**
 * Deadline-aware order status, polled:
 * - every 3s during the first 90s of watching an order
 * - every 15s after that
 * - never once the order reaches a terminal state
 *
 * Reads the same payment status key that
 * useCreatePaymentIntentMutation seeds — the first render is instant.
 *
 * On SUCCESS, invalidates credit balance + history (credits were granted).
 */
export function usePaymentStatus(orderId: string | null) {
  const queryClient = useQueryClient()
  const startedAtRef = useRef<number | null>(null)

  // Restart the fast-poll window whenever a different order is watched.
  useEffect(() => {
    startedAtRef.current = orderId ? Date.now() : null
  }, [orderId])

  const query = useAuthQuery<PaymentStatusResult>({
    queryKey: queryKeys.payments.status(orderId),
    queryFn: () => fetchPaymentStatus(orderId as string),
    enabled: orderId !== null,
    staleTime: 0, // polling is the truth source
    refetchInterval: (q) => {
      const status = q.state.data?.status
      if (status && TERMINAL_STATUSES.includes(status)) {
        return false // terminal — stop polling
      }
      const startedAt = startedAtRef.current
      return startedAt !== null && Date.now() - startedAt < FAST_WINDOW_MS
        ? FAST_POLL_MS
        : SLOW_POLL_MS
    },
  })

  const isTerminal = query.data
    ? TERMINAL_STATUSES.includes(query.data.status)
    : false

  // Credits granted exactly once on approval — refresh balance + history.
  useEffect(() => {
    if (query.data?.status === 'SUCCESS') {
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.balance() })
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.histories() })
    }
  }, [query.data?.status, queryClient])

  return { ...query, isTerminal }
}
