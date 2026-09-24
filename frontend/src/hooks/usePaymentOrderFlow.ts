import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useActivePaymentOrder } from '@/hooks/queries/useActivePaymentOrder'
import { usePaymentStatus } from '@/hooks/queries/usePaymentStatus'
import { queryKeys } from '@/lib/queryKeys'
import type { ActivePaymentOrderResponse } from '@/types/payment'

/** Keeps the latest order visible as it moves from active to terminal. */
export function usePaymentOrderFlow() {
  const queryClient = useQueryClient()
  const activeQuery = useActivePaymentOrder()
  const activeOrder = activeQuery.data?.order ?? null
  const [recentOrderId, setRecentOrderId] = useState<string | null>(null)

  if (activeOrder && activeOrder.id !== recentOrderId) {
    setRecentOrderId(activeOrder.id)
  }

  const orderId = activeOrder?.id ?? recentOrderId
  const statusQuery = usePaymentStatus(orderId)
  const statusOrder = statusQuery.data
  const order =
    (statusOrder && (!activeOrder || statusQuery.dataUpdatedAt > activeQuery.dataUpdatedAt)
      ? statusOrder
      : activeOrder) ?? null

  const isLoading = activeQuery.isLoading || Boolean(orderId && !order && statusQuery.isPending)
  const hasStatusError = Boolean(orderId && !order && statusQuery.isError)
  const errorMessage = hasStatusError
    ? 'Không tải được trạng thái đơn hàng. Vui lòng thử lại.'
    : activeQuery.isError && !order
      ? 'Không tải được đơn hàng hiện tại. Vui lòng thử lại.'
      : null

  const retry = () => {
    if (hasStatusError) void statusQuery.refetch()
    else void activeQuery.refetch()
  }

  const dismissResult = () => {
    queryClient.setQueryData<ActivePaymentOrderResponse>(queryKeys.payments.active(), {
      order: null,
    })
    setRecentOrderId(null)
    void queryClient.invalidateQueries({ queryKey: queryKeys.payments.active() })
  }

  return { order, isLoading, errorMessage, retry, dismissResult }
}
