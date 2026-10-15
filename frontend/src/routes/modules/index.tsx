import { createFileRoute } from '@tanstack/react-router'
import { ModuleList } from '@/components/features/modules'

export const Route = createFileRoute('/modules/')({
  component: ModulesIndexPage,
})

function ModulesIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <header className="mb-8">
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            Khóa học
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chọn một khóa học để bắt đầu học và nộp bài.
          </p>
        </header>
        <div className="fade-in">
          <ModuleList />
        </div>
      </div>
    </div>
  )
}
