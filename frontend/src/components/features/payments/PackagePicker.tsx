import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingDots } from '@/components/ui/loading-dots'
import { usePaymentPackages } from '@/hooks/queries/usePaymentPackages'
import { useCreatePaymentIntentMutation } from '@/hooks/mutations/useCreatePaymentIntent'
import { ApiError } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'
import { formatVnd } from './format'
import type { PaymentPackageListItem } from '@/types/payment'

function newClientRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** Package selection → primary CTA creates (or reuses) the manual order. */
export function PackagePicker() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data, isLoading, isError, refetch } = usePaymentPackages()
  const createMutation = useCreatePaymentIntentMutation()
  const queryClient = useQueryClient()

  const packages = data?.packages ?? []
  // Preselect the popular package until the user picks another.
  const effectiveSelected =
    selectedId ?? packages.find((p) => p.isPopular)?.id ?? packages[0]?.id ?? null

  const handleCreate = () => {
    if (!effectiveSelected) return
    createMutation.mutate(
      { packageId: effectiveSelected, clientRequestId: newClientRequestId() },
      {
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.info('Bạn đã có đơn hàng đang chờ xử lý')
            void queryClient.invalidateQueries({ queryKey: queryKeys.payments.active() })
          } else {
            toast.error(err instanceof Error ? err.message : 'Không tạo được đơn hàng, thử lại sau')
          }
        },
      },
    )
  }

  if (isLoading) {
    return <LoadingDots className="py-6" />
  }

  if (isError) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/20 p-4 text-sm">
        <p role="alert">Không tải được các gói credit. Vui lòng thử lại.</p>
        <Button variant="outline" onClick={() => void refetch()}>
          Thử lại
        </Button>
      </div>
    )
  }

  if (packages.length === 0) {
    return <p className="text-sm text-muted-foreground">Hiện chưa có gói credit để nạp.</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            selected={effectiveSelected === pkg.id}
            onSelect={() => setSelectedId(pkg.id)}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Thanh toán bằng chuyển khoản ngân hàng qua mã VietQR. Mỗi tài khoản chỉ có một đơn nạp đang
        hoạt động mỗi lúc.
      </p>

      <Button
        onClick={handleCreate}
        disabled={!effectiveSelected || createMutation.isPending}
        className="min-h-11 w-full bg-cta text-white hover:bg-cta/90"
      >
        {createMutation.isPending ? 'Đang tạo đơn…' : 'Tạo đơn chuyển khoản'}
      </Button>
    </div>
  )
}

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: PaymentPackageListItem
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'cursor-pointer rounded-xl border p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta',
        selected
          ? 'border-cta bg-cta/5 ring-2 ring-cta/20'
          : 'border-zinc-200 hover:border-zinc-300',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-heading font-semibold text-zinc-900">{pkg.label}</p>
        {pkg.isPopular && (
          <Badge className="border-amber-200 bg-amber-50 text-amber-700">Phổ biến</Badge>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900">
        {pkg.credits}
        <span className="ml-1 text-sm font-normal text-muted-foreground">credit</span>
      </p>
      <p className="mt-1 text-sm tabular-nums text-muted-foreground">{formatVnd(pkg.amountVnd)}</p>
    </button>
  )
}
