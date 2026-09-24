import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Clock, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useConfirmPayment } from '@/hooks/mutations/useConfirmPayment'
import { useCancelPayment } from '@/hooks/mutations/useCancelPayment'
import { useNow } from '@/hooks/useNow'
import { ApiError } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import type { PaymentOrder } from '@/types/payment'
import { CopyButton } from './CopyButton'
import { formatTime, formatVnd, minutesUntil } from './format'
import { paymentStatusMeta } from './paymentStatusMeta'

interface PendingTransferCardProps {
  order: PaymentOrder
}

/** PENDING_TRANSFER: VietQR + receipt + confirm/cancel, with a live deadline. */
export function PendingTransferCard({ order }: PendingTransferCardProps) {
  const queryClient = useQueryClient()
  const confirmMutation = useConfirmPayment(order.id)
  const cancelMutation = useCancelPayment(order.id)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [qrFailed, setQrFailed] = useState(false)

  const now = useNow(5_000)
  const pastDeadline = now >= Date.parse(order.expires_at)
  const minutesLeft = minutesUntil(order.expires_at, now)

  const invalidateOrder = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.payments.active() })
    void queryClient.invalidateQueries({ queryKey: queryKeys.payments.status(order.id) })
  }

  // Deadline crossed on-screen: refetch so the server flips the order to
  // EXPIRED (effective status) — no client-side status guessing.
  useEffect(() => {
    if (!pastDeadline) return
    invalidateOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pastDeadline, order.id, queryClient])

  const handleConfirm = () => {
    confirmMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success('Đã ghi nhận chuyển khoản — đang chờ xác minh')
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.error('Đơn đã hết hạn hoặc đã được xử lý')
          invalidateOrder()
        } else if (err instanceof ApiError && err.status === 404) {
          toast.error('Không tìm thấy đơn hàng')
          invalidateOrder()
        } else {
          toast.error(err instanceof Error ? err.message : 'Xác nhận thất bại, thử lại sau')
        }
      },
    })
  }

  const handleCancel = () => {
    cancelMutation.mutate(undefined, {
      onSuccess: (cancelled) => {
        setCancelOpen(false)
        toast.success(cancelled.status === 'EXPIRED' ? 'Đơn đã hết hạn' : 'Đã hủy đơn hàng')
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.error('Không thể hủy — đơn đang chờ xác minh')
          setCancelOpen(false)
          invalidateOrder()
        } else {
          toast.error(err instanceof Error ? err.message : 'Hủy đơn thất bại, thử lại sau')
        }
      },
    })
  }

  const status = paymentStatusMeta.PENDING_TRANSFER

  return (
    <div className="fade-in space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={status.variant}>{status.label}</Badge>
        <p className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
          <Clock className="h-4 w-4" />
          {pastDeadline ? 'Đang kiểm tra hạn đơn…' : `Còn ${minutesLeft} phút`}
          <span className="text-zinc-300">•</span>
          hết hạn lúc {formatTime(order.expires_at)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
        {/* VietQR */}
        <div className="mx-auto w-44 rounded-xl bg-white p-3 ring-1 ring-zinc-200 sm:mx-0">
          {qrFailed ? (
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg bg-zinc-50 text-zinc-500">
              <QrCode className="h-10 w-10" />
              <span className="text-center text-xs">Không tải được mã QR</span>
              <Button variant="outline" size="sm" onClick={() => setQrFailed(false)}>
                Thử lại
              </Button>
            </div>
          ) : (
            <img
              src={order.qr_url}
              alt="Mã VietQR chuyển khoản"
              className="aspect-square w-full rounded-lg object-contain"
              onError={() => setQrFailed(true)}
            />
          )}
          {!qrFailed && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Quét bằng app ngân hàng
            </p>
          )}
        </div>

        {/* Receipt */}
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
          <Separator className="my-2.5" />
          <div className="flex flex-wrap items-center justify-between gap-1 text-sm">
            <span className="text-muted-foreground">Nội dung chuyển khoản</span>
            <span className="flex items-center gap-0.5">
              <span className="font-mono font-semibold tracking-wider text-cta">
                {order.transfer_message}
              </span>
              <CopyButton value={order.transfer_message} label="Sao chép nội dung chuyển khoản" />
            </span>
          </div>
          <div className="mt-1.5 flex justify-between text-sm">
            <span className="text-muted-foreground">Hết hạn lúc</span>
            <span className="font-medium tabular-nums text-zinc-900">
              {formatTime(order.expires_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Chỉ nhấn “Tôi đã chuyển khoản” sau khi app ngân hàng báo thành công. Nội dung chuyển khoản
          phải đúng mã đơn để được cộng credit.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="ghost"
          onClick={() => setCancelOpen(true)}
          disabled={confirmMutation.isPending || cancelMutation.isPending}
          className="min-h-11 text-zinc-500 hover:text-zinc-900"
        >
          Hủy đơn
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={confirmMutation.isPending || pastDeadline}
          className="min-h-11 bg-cta text-white hover:bg-cta/90 sm:min-w-48"
        >
          {confirmMutation.isPending ? 'Đang gửi…' : 'Tôi đã chuyển khoản'}
        </Button>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hủy đơn hàng?</DialogTitle>
            <DialogDescription>
              Đơn {order.order_code} sẽ bị hủy. Chỉ hủy nếu bạn chưa chuyển tiền; nếu đã chuyển, hãy
              giữ đơn và xác nhận chuyển khoản.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="min-h-11" onClick={() => setCancelOpen(false)}>
              Giữ lại
            </Button>
            <Button
              variant="destructive"
              className="min-h-11"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Đang hủy…' : 'Hủy đơn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
