import { createFileRoute, Link } from '@tanstack/react-router'
import { useModule } from '@/hooks/queries/useModule'
import { ApiError } from '@/lib/errors'
import { ModuleDetail } from '@/components/features/modules'
import { LoadingScreen } from '@/components/ui/loading-dots'

export const Route = createFileRoute('/modules/$slug')({
  component: ModuleDetailPage,
})

function ModuleDetailPage() {
  const { slug } = Route.useParams()
  const { data, isLoading, error } = useModule(slug)

  const isNotFound =
    !isLoading && error instanceof ApiError && error.status === 404

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isNotFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-4">
        <h1 className="font-heading text-4xl font-bold text-zinc-900">404</h1>
        <p className="mt-2 text-zinc-500">Không tìm thấy khóa học.</p>
        <Link
          to="/modules"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Xem tất cả khóa học
        </Link>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-center px-4">
        <p className="text-zinc-600">Không thể tải nội dung khóa học.</p>
        <Link
          to="/modules"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Quay lại
        </Link>
      </div>
    )
  }

  return (
    <div className="fade-in">
      <ModuleDetail module={data} />
    </div>
  )
}
