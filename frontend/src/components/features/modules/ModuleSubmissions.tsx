import { useState } from 'react'
import { useSubmissions, type Submission } from '@/hooks/queries/useSubmissions'
import { Badge } from '@/components/ui/badge'
import { GradeConfirmDialog } from '@/components/features/credits/GradeConfirmDialog'

interface ModuleSubmissionsProps {
  moduleId: number
}

const statusMeta: Record<string, { label: string; variant: 'secondary' | 'default' | 'outline' | 'destructive' }> = {
  UPLOADED: { label: 'Chưa chấm', variant: 'secondary' },
  GRADING: { label: 'Đang chấm', variant: 'default' },
  AWAITING_HUNG: { label: 'Chờ Hùng chấm', variant: 'default' },
  COMPLETED: { label: 'Đã chấm', variant: 'outline' },
  FAILED: { label: 'Lỗi', variant: 'destructive' },
}

export function ModuleSubmissions({ moduleId }: ModuleSubmissionsProps) {
  const { data: submissions, isLoading } = useSubmissions()
  const [gradeTarget, setGradeTarget] = useState<Submission | null>(null)

  const moduleSubmissions = (submissions ?? []).filter(
    (s) => s.moduleId != null && String(s.moduleId) === String(moduleId),
  )

  return (
    <section className="space-y-4">
      <h2 className="font-heading text-lg font-semibold text-zinc-900">
        Bài nộp của bạn
      </h2>

      {isLoading ? (
        <div className="flex gap-1 py-6">
          <span className="loading-dot" />
          <span className="loading-dot" style={{ animationDelay: '0.15s' }} />
          <span className="loading-dot" style={{ animationDelay: '0.3s' }} />
        </div>
      ) : moduleSubmissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Bạn chưa nộp bài cho khóa học này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {moduleSubmissions.map((sub, i) => {
            const status = statusMeta[sub.status]
            return (
              <div
                key={sub.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <img
                  src={sub.processedPhotoUrl ?? sub.originalPhotoUrl ?? undefined}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                {status && (
                  <Badge variant={status.variant} className="absolute left-2 top-2 shadow-sm">
                    {status.label}
                  </Badge>
                )}
                {sub.status === 'UPLOADED' && (
                  <button
                    type="button"
                    onClick={() => setGradeTarget(sub)}
                    className="absolute inset-x-2 bottom-2 cursor-pointer rounded-md bg-white/90 px-2 py-1.5 text-xs font-semibold text-zinc-900 shadow-sm backdrop-blur transition-colors hover:bg-white"
                  >
                    Chấm điểm
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {gradeTarget && (
        <GradeConfirmDialog
          submissionId={gradeTarget.id}
          photoUrl={gradeTarget.processedPhotoUrl ?? gradeTarget.originalPhotoUrl}
          open={!!gradeTarget}
          onOpenChange={(open) => {
            if (!open) setGradeTarget(null)
          }}
        />
      )}
    </section>
  )
}
