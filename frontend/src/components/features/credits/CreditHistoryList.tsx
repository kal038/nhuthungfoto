import { useState } from 'react'
import { Gift, Sparkles, User, PlusCircle, Undo2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCreditHistory, type CreditHistoryEntry } from '@/hooks/queries/useCredits'
import { Button } from '@/components/ui/button'
import { LoadingDots } from '@/components/ui/loading-dots'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

function entryMeta(entry: CreditHistoryEntry): { label: string; Icon: typeof Gift } {
  switch (entry.type) {
    case 'STARTER_BONUS':
      return { label: 'Thưởng xác thực email', Icon: Gift }
    case 'SPEND': {
      const reviewType = (entry.metadata as { review_type?: string } | null)?.review_type
      return reviewType === 'HUNG'
        ? { label: 'Chấm bởi Hùng', Icon: User }
        : { label: 'Chấm AI', Icon: Sparkles }
    }
    case 'PURCHASE':
      return { label: 'Nạp credit', Icon: PlusCircle }
    case 'REFUND':
      return { label: 'Hoàn credit', Icon: Undo2 }
    default:
      return { label: entry.type, Icon: PlusCircle }
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Paginated credit transaction ledger — the "invoice trail".
 */
export function CreditHistoryList() {
  const [page, setPage] = useState(0)
  const { data, isLoading } = useCreditHistory(PAGE_SIZE, page * PAGE_SIZE)

  const entries = data?.entries ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  if (isLoading) {
    return <LoadingDots className="py-6" />
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">Chưa có giao dịch nào.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <ul className="divide-y divide-zinc-100">
        {entries.map((entry) => {
          const { label, Icon } = entryMeta(entry)
          const positive = entry.amount > 0
          return (
            <li key={entry.id} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">{label}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatDate(entry.created_at)}
                </p>
              </div>
              <span
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  positive ? 'text-green-600' : 'text-zinc-900',
                )}
              >
                {positive ? '+' : ''}
                {entry.amount}
              </span>
            </li>
          )
        })}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
