import { CheckCircle2, TimerOff, XCircle, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaymentOrder, PaymentOrderStatus } from '@/types/payment'
import { cn } from '@/lib/utils'
import { formatVnd } from './format'

interface PaymentResultCardProps {
  order: PaymentOrder
  onNewOrder: () => void
}

const RESULT_META: Record<
  Extract<PaymentOrderStatus, 'SUCCESS' | 'CANCELLED' | 'EXPIRED'>,
  { Icon: LucideIcon; iconClass: string; title: string }
> = {
  SUCCESS: {
    Icon: CheckCircle2,
    iconClass: 'text-green-600',
    title: 'Nạp credit thành công',
  },
  CANCELLED: { Icon: XCircle, iconClass: 'text-zinc-400', title: 'Đã hủy đơn hàng' },
  EXPIRED: { Icon: TimerOff, iconClass: 'text-destructive', title: 'Đơn đã hết hạn' },
}

function detailFor(order: PaymentOrder): string {
  switch (order.status) {
    case 'SUCCESS':
      return `+${order.credit_amount} credit đã được cộng vào tài khoản của bạn.`
    case 'CANCELLED':
      return `Đơn ${order.order_code} đã được hủy — không có khoản nào bị trừ. Tạo đơn mới bất cứ lúc nào.`
    default:
      return `Đơn ${order.order_code} quá thời hạn thanh toán. Tạo đơn mới nếu vẫn muốn nạp credit.`
  }
}

/** Terminal state: SUCCESS / CANCELLED / EXPIRED. */
export function PaymentResultCard({ order, onNewOrder }: PaymentResultCardProps) {
  const meta = RESULT_META[order.status as keyof typeof RESULT_META] ?? RESULT_META.EXPIRED

  return (
    <div className="fade-in space-y-4 rounded-xl border border-zinc-100 p-6 text-center">
      <meta.Icon className={cn('mx-auto h-10 w-10', meta.iconClass)} />
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-semibold text-zinc-900">{meta.title}</h3>
        <p className="text-sm text-muted-foreground">{detailFor(order)}</p>
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">
        {order.package_label} · {formatVnd(order.amount_vnd)} · mã {order.order_code}
      </p>
      <Button onClick={onNewOrder} className="min-h-11 bg-cta text-white hover:bg-cta/90">
        Tạo đơn mới
      </Button>
    </div>
  )
}
