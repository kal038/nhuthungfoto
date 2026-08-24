export const statusMeta: Record<
  string,
  { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }
> = {
  UPLOADED: { label: 'Chưa gửi chấm', variant: 'secondary' },
  GRADING: { label: 'Đang chấm', variant: 'default' },
  AWAITING_HUNG: { label: 'Chờ Hùng chấm', variant: 'default' },
  COMPLETED: { label: 'Đã chấm', variant: 'outline' },
  FAILED: { label: 'Lỗi', variant: 'destructive' },
}
