import { Badge } from '@/components/ui/badge'
import { useNow } from '@/hooks/useNow'
import type { Submission } from '@/hooks/queries/useSubmissions'
import { cn } from '@/lib/utils'
import { statusMeta } from './statusMeta'

export interface SubmissionCardProps {
  submission: Submission
  onSelectReview?: (submission: Submission) => void
  onSelectGrade?: (submission: Submission) => void
  className?: string
}

// Countdown: Hùng reviews within 24h, so show remaining hours (decreases as
// the student waits). Once past the SLA, fall back to a neutral label.
const LIMIT_HOURS = 24

function WaitingBadge({ createdAt }: { createdAt: string }) {
  const now = useNow()
  const elapsedMs = now - new Date(createdAt).getTime()
  const remainingHours = Math.max(
    0,
    Math.ceil((LIMIT_HOURS * 60 * 60 * 1000 - elapsedMs) / (60 * 60 * 1000)),
  )
  return (
    <span className="rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-amber-300 backdrop-blur-md">
      {remainingHours > 0 ? `Chờ ${remainingHours} giờ` : 'Đang chờ Hùng chấm'}
    </span>
  )
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
  const isPending = submission.status === 'GRADING' || submission.status === 'AWAITING_HUNG'
  const isCompleted = submission.status === 'COMPLETED'
  const isUploaded = submission.status === 'UPLOADED'

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
        {isPending && <WaitingBadge createdAt={submission.createdAt} />}
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
