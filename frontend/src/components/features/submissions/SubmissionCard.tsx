import { Badge } from '@/components/ui/badge'
import type { Submission } from '@/hooks/queries/useSubmissions'
import { cn } from '@/lib/utils'

export interface SubmissionCardProps {
  submission: Submission
  onSelectReview?: (submission: Submission) => void
  onSelectGrade?: (submission: Submission) => void
  className?: string
}

const statusMeta: Record<
  string,
  { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }
> = {
  UPLOADED: { label: 'Chưa gửi chấm', variant: 'secondary' },
  GRADING: { label: 'Đang chấm', variant: 'default' },
  AWAITING_HUNG: { label: 'Chờ Hùng chấm', variant: 'default' },
  COMPLETED: { label: 'Đã chấm', variant: 'outline' },
  FAILED: { label: 'Lỗi', variant: 'destructive' },
}

export function SubmissionCard({
  submission,
  onSelectReview,
  onSelectGrade,
  className,
}: SubmissionCardProps) {
  const meta = statusMeta[submission.status] ?? {
    label: submission.status,
    variant: 'secondary',
  }
  const isPending =
    submission.status === 'GRADING' || submission.status === 'AWAITING_HUNG'
  const isCompleted = submission.status === 'COMPLETED'
  const isUploaded = submission.status === 'UPLOADED'

  const daysWaiting = Math.max(
    0,
    Math.floor(
      (Date.now() - new Date(submission.createdAt).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  )
  const waitingLabel =
    daysWaiting === 0 ? 'Chờ hôm nay' : `Chờ ${daysWaiting} ngày`

  const handleClick = () => {
    if (isCompleted && onSelectReview) {
      onSelectReview(submission)
    } else if (isUploaded && onSelectGrade) {
      onSelectGrade(submission)
    }
  }

  const isClickable = isCompleted || isUploaded

  return (
    <div
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          handleClick()
        }
      }}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200 transition-all duration-200',
        isClickable &&
          'cursor-pointer hover:shadow-md hover:ring-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta',
        className,
      )}
    >
      <img
        src={submission.processedPhotoUrl ?? submission.originalPhotoUrl ?? undefined}
        alt="Bài nộp"
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-90 pointer-events-none" />

      {/* Status Badge */}
      <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1.5">
        <Badge variant={meta.variant} className="shadow-sm backdrop-blur-md">
          {meta.label}
        </Badge>
        {isPending && (
          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-amber-300 backdrop-blur-md">
            {waitingLabel}
          </span>
        )}
      </div>

      {/* Action overlay / hint text at bottom */}
      {isClickable && (
        <div className="absolute inset-x-2.5 bottom-2.5">
          <div className="rounded-lg bg-white/90 px-3 py-1.5 text-center text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur transition-all group-hover:bg-white">
            {isCompleted ? 'Xem đánh giá' : 'Gửi chấm điểm'}
          </div>
        </div>
      )}
    </div>
  )
}
