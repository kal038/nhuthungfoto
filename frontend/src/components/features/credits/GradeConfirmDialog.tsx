import { useEffect, useState } from 'react'
import { Zap, User, ImageOff } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCreditBalance } from '@/hooks/queries/useCredits'
import { useGradeSubmissionMutation } from '@/hooks/mutations/useGradeSubmission'
import { ApiError } from '@/lib/errors'
import { cn } from '@/lib/utils'

// Mirrors backend CREDIT_COST in backend/src/schema/credit.ts — keep in sync.
const REVIEW_OPTIONS = [
  {
    type: 'AI' as const,
    cost: 1,
    Icon: Zap,
    title: 'Chấm AI',
    description: 'Tức thì — phản hồi trong vài giây',
    premium: false,
  },
  {
    type: 'HUNG' as const,
    cost: 3,
    Icon: User,
    title: 'Nhựt Hùng chấm',
    description: 'Nhận xét cá nhân — phản hồi trong 24–48 giờ',
    premium: true,
  },
]

type ReviewType = (typeof REVIEW_OPTIONS)[number]['type']

interface GradeConfirmDialogProps {
  submissionId: string
  photoUrl?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Checkout-style confirmation for spending credits on a review.
 * Makes the cost explicit: balance → cost → remaining, before commit.
 */
export function GradeConfirmDialog({
  submissionId,
  photoUrl,
  open,
  onOpenChange,
}: GradeConfirmDialogProps) {
  const [reviewType, setReviewType] = useState<ReviewType>('AI')
  const { data: balance, isLoading: balanceLoading } = useCreditBalance()
  const gradeMutation = useGradeSubmissionMutation()

  // Reset selection whenever a different submission is targeted
  useEffect(() => {
    if (open) setReviewType('AI')
  }, [open, submissionId])

  const selected = REVIEW_OPTIONS.find((o) => o.type === reviewType)!
  const currentBalance = balance ?? 0
  const remaining = currentBalance - selected.cost
  const insufficient = !balanceLoading && remaining < 0

  const handleConfirm = () => {
    gradeMutation.mutate(
      { submissionId, reviewType },
      {
        onSuccess: (data) => {
          onOpenChange(false)
          toast.success(`Đã trừ ${data.creditsSpent} credit — bài nộp đang được chấm`)
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 402) {
            toast.error('Không đủ credit')
          } else if (err instanceof ApiError && err.status === 409) {
            toast.error('Bài nộp này đang được chấm rồi')
            onOpenChange(false)
          } else {
            toast.error(err instanceof Error ? err.message : 'Chấm điểm thất bại, thử lại sau')
          }
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xác nhận chấm điểm</DialogTitle>
          <DialogDescription>
            Credit sẽ bị trừ ngay khi bạn xác nhận.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo under review */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-100">
            {photoUrl ? (
              <img src={photoUrl} alt="Ảnh cần chấm" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-300">
                <ImageOff className="h-8 w-8" />
              </div>
            )}
          </div>

          {/* Review type options */}
          <div className="grid grid-cols-2 gap-3">
            {REVIEW_OPTIONS.map((option) => (
              <button
                key={option.type}
                type="button"
                onClick={() => setReviewType(option.type)}
                className={cn(
                  'cursor-pointer rounded-xl border p-3 text-left transition-all duration-150',
                  reviewType === option.type
                    ? 'border-cta ring-2 ring-cta/20 bg-cta/5'
                    : 'border-zinc-200 hover:border-zinc-300',
                )}
              >
                <div className="flex items-center justify-between">
                  <option.Icon className="h-4 w-4 text-zinc-700" />
                  {option.premium && <Badge variant="secondary">Premium</Badge>}
                </div>
                <p className="mt-2 text-sm font-semibold text-zinc-900">{option.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
                <p className="mt-2 text-sm font-semibold text-cta tabular-nums">
                  {option.cost} credit
                </p>
              </button>
            ))}
          </div>

          {/* Receipt */}
          <div className="rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Số dư hiện tại</span>
              <span className="tabular-nums font-medium text-zinc-900">
                {balanceLoading ? '…' : currentBalance}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">Chi phí</span>
              <span className="tabular-nums font-medium text-zinc-900">
                −{selected.cost}
              </span>
            </div>
            <Separator className="my-2.5" />
            <div className="flex justify-between text-sm">
              <span className="font-medium text-zinc-900">Còn lại</span>
              <span
                className={cn(
                  'tabular-nums font-semibold',
                  insufficient ? 'text-red-600' : 'text-zinc-900',
                )}
              >
                {balanceLoading ? '…' : remaining}
              </span>
            </div>
            {insufficient && (
              <p className="mt-2 text-xs text-red-600">
                Không đủ credit cho lựa chọn này.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={insufficient || balanceLoading || gradeMutation.isPending}
            className="w-full bg-cta text-white hover:bg-cta/90"
          >
            {gradeMutation.isPending
              ? 'Đang xử lý…'
              : `Xác nhận − ${selected.cost} credit`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
