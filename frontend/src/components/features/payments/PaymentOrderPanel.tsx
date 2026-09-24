import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingDots } from '@/components/ui/loading-dots'
import { usePaymentOrderFlow } from '@/hooks/usePaymentOrderFlow'
import { PackagePicker } from './PackagePicker'
import { PendingTransferCard } from './PendingTransferCard'
import { AwaitingReviewCard } from './AwaitingReviewCard'
import { PaymentResultCard } from './PaymentResultCard'

/** Renders the current manual payment step. */
export function PaymentOrderPanel() {
  const { order, isLoading, errorMessage, retry, dismissResult } = usePaymentOrderFlow()

  let content: ReactNode
  if (isLoading) {
    content = <LoadingDots className="py-6" />
  } else if (errorMessage) {
    content = (
      <div className="space-y-3 rounded-xl border border-destructive/20 p-4 text-sm">
        <p role="alert">{errorMessage}</p>
        <Button variant="outline" onClick={retry}>
          Thử lại
        </Button>
      </div>
    )
  } else if (!order) {
    content = <PackagePicker />
  } else if (order.status === 'PENDING_TRANSFER') {
    content = <PendingTransferCard order={order} />
  } else if (order.status === 'AWAITING_REVIEW') {
    content = <AwaitingReviewCard order={order} />
  } else {
    content = <PaymentResultCard order={order} onNewOrder={dismissResult} />
  }

  return (
    <section id="nap-credit" className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-zinc-900">Nạp credit</h2>
      {content}
    </section>
  )
}
