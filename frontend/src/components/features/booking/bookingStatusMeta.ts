import type { BookingStatus } from '@/types/booking'

/** Badge label + variant per booking status (mirrors payments/paymentStatusMeta.ts). */
export const bookingStatusMeta: Record<
  BookingStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  ACCEPTED: { label: 'Đã xác nhận', variant: 'default' },
  PENDING: { label: 'Chờ xác nhận', variant: 'secondary' },
  CANCELLED: { label: 'Đã hủy', variant: 'secondary' },
}
