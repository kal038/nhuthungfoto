import { Badge } from '@/components/ui/badge'
import type { AdminSubmissionItem } from '@/hooks/queries/useAdminQueue'
import { cn } from '@/lib/utils'

export interface AdminSubmissionCardProps {
  item: AdminSubmissionItem
  onSelect?: (item: AdminSubmissionItem) => void
  className?: string
}

export function AdminSubmissionCard({
  item,
  onSelect,
  className,
}: AdminSubmissionCardProps) {
  const waitingLabel =
    item.waitingDays === 0 ? 'Chờ hôm nay' : `Chờ ${item.waitingDays} ngày`
  const overdue = item.waitingDays >= 1

  const createdLabel = new Date(item.createdAt).toLocaleString('vi-VN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      onClick={() => onSelect?.(item)}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={(e) => {
        if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onSelect(item)
        }
      }}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-border transition-all duration-200',
        onSelect &&
          'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta',
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {item.photoUrl ? (
          <img
            src={item.photoUrl}
            alt={`Bài nộp của ${item.studentName ?? 'học viên'}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Không có ảnh
          </div>
        )}
        <Badge
          variant={overdue ? 'destructive' : 'default'}
          className="absolute left-2.5 top-2.5 shadow-sm backdrop-blur-md"
        >
          {waitingLabel}
        </Badge>
      </div>

      <div className="space-y-0.5 px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.studentName ?? 'Không tên'}
          <span className="ml-1.5 truncate text-xs font-normal text-muted-foreground">
            {item.studentEmail}
          </span>
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {item.moduleTitle ?? 'Không có bài học'}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">{createdLabel}</p>
      </div>
    </div>
  )
}
