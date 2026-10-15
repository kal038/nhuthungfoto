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
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
        <h1 className="font-heading text-4xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">Không tìm thấy khóa học.</p>
        <Link
          to="/modules"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Xem tất cả khóa học
        </Link>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
        <p className="text-muted-foreground">Không thể tải nội dung khóa học.</p>
        <Link
          to="/modules"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
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
