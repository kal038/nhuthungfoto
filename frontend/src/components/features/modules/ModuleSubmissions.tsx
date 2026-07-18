import { useSubmissions } from '@/hooks/queries/useSubmissions'

interface ModuleSubmissionsProps {
  moduleId: number
}

export function ModuleSubmissions({ moduleId }: ModuleSubmissionsProps) {
  const { data: submissions, isLoading } = useSubmissions()

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
          {moduleSubmissions.map((sub, i) => (
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
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
