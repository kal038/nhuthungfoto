import { useModules } from '@/hooks/queries/useModules'
import { ModuleCard } from './ModuleCard'

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl bg-white ring-1 ring-foreground/10"
        >
          <div className="aspect-video w-full animate-pulse bg-zinc-100" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-full animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ModuleList() {
  const { data, isLoading, isError } = useModules()

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SkeletonGrid />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-zinc-600">Không thể tải danh sách khóa học.</p>
      </div>
    )
  }

  const modules = data?.modules ?? []
  const currentModule = data?.currentModule ?? null

  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-zinc-600">Chưa có khóa học nào.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((module, i) => (
        <div key={module.id} className="fade-in" style={{ animationDelay: `${i * 60}ms` }}>
          <ModuleCard module={module} isCurrent={module.id === currentModule} />
        </div>
      ))}
    </div>
  )
}
