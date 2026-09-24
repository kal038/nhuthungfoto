import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { queryKeys } from '@/lib/queryKeys'
import type { PaymentOrder } from '@/types/payment'
import { cn } from '@/lib/utils'
import { formatDateTime, formatVnd } from './format'
import { paymentStatusMeta } from './paymentStatusMeta'

interface AwaitingReviewCardProps {
  order: PaymentOrder
}

/**
 * AWAITING_REVIEW: money is claimed, admin verifies the bank statement.
 * No polling — window-focus refetch plus this manual refresh.
 */
export function AwaitingReviewCard({ order }: AwaitingReviewCardProps) {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.active() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.status(order.id) }),
    ])
    setRefreshing(false)
  }

  const status = paymentStatusMeta.AWAITING_REVIEW

  return (
    <div className="fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={status.variant}>{status.label}</Badge>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={cn(refreshing && 'animate-spin')} />
          Làm mới
        </Button>
      </div>

      <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Gói</span>
          <span className="font-medium text-zinc-900">
            {order.package_label} · {order.credit_amount} credit
          </span>
        </div>
        <div className="mt-1.5 flex justify-between text-sm">
          <span className="text-muted-foreground">Số tiền</span>
          <span className="font-semibold tabular-nums text-zinc-900">
            {formatVnd(order.amount_vnd)}
          </span>
        </div>
        <div className="mt-1.5 flex justify-between text-sm">
          <span className="text-muted-foreground">Mã đơn</span>
          <span className="font-mono font-medium tracking-wider text-zinc-900">
            {order.order_code}
          </span>
        </div>
        <Separator className="my-2.5" />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Xác nhận lúc</span>
          <span className="font-medium tabular-nums text-zinc-900">
            {order.confirmed_at ? formatDateTime(order.confirmed_at) : '—'}
          </span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Chúng tôi sẽ đối chiếu sao kê ngân hàng và cộng {order.credit_amount} credit vào tài khoản
        của bạn sau khi xác minh. Bạn có thể quay lại trang này để xem trạng thái đơn.
      </p>
    </div>
  )
}
