import type { PaymentOrderStatus } from '@/types/payment'

/** Badge label + variant per order status (mirrors submissions/statusMeta.ts). */
export const paymentStatusMeta: Record<
  PaymentOrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  PENDING_TRANSFER: { label: 'Chờ chuyển khoản', variant: 'secondary' },
  AWAITING_REVIEW: { label: 'Chờ xác minh', variant: 'default' },
  SUCCESS: { label: 'Thành công', variant: 'outline' },
  CANCELLED: { label: 'Đã hủy', variant: 'secondary' },
  EXPIRED: { label: 'Hết hạn', variant: 'destructive' },
}
