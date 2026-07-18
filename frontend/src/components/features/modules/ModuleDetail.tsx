import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUp, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ModuleDetail } from '@/types/modules'
import { ModuleMarkdown } from './ModuleMarkdown'
import { ModuleSubmissions } from './ModuleSubmissions'
import { PhotoUploadContainer } from '@/components/features/upload/PhotoUploadContainer'

const levelLabelMap: Record<string, string> = {
  BEGINNER: 'Cơ bản',
  INTERMEDIATE: 'Trung cấp',
  ADVANCED: 'Nâng cao',
}

const trackLabelMap: Record<string, string> = {
  PORTRAIT: 'Chân dung',
  STREET: 'Đường phố',
  TRAVEL: 'Du lịch',
  PRODUCT: 'Sản phẩm',
}

interface ModuleDetailProps {
  module: ModuleDetail
}

export function ModuleDetail({ module }: ModuleDetailProps) {
  const queryClient = useQueryClient()
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['submissions'] })
  }

  return (
    <article className="min-h-screen bg-white">
      {/* Cover */}
      {module.coverPhotoUrl && (
        <div className="relative h-64 w-full overflow-hidden bg-zinc-100 sm:h-80">
          <img
            src={module.coverPhotoUrl}
            alt={module.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Back link */}
        <Link
          to="/modules"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Tất cả khóa học
        </Link>

        {/* Header */}
        <header className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {module.level && (
              <Badge variant="secondary">{levelLabelMap[module.level] ?? module.level}</Badge>
            )}
            {module.track && (
              <Badge variant="outline">{trackLabelMap[module.track] ?? module.track}</Badge>
            )}
            {module.estimatedMinutes != null && (
              <Badge variant="ghost">~{module.estimatedMinutes} phút</Badge>
            )}
          </div>
          <h1 className="font-heading text-3xl font-semibold text-zinc-900 sm:text-4xl">
            {module.title}
          </h1>
          {module.description && (
            <p className="text-base text-muted-foreground">{module.description}</p>
          )}
        </header>

        <hr className="my-8 border-zinc-100" />

        {/* Content */}
        <section className="space-y-6">
          <ModuleMarkdown content={module.contentMarkdown} />
        </section>

        {/* Example photos */}
        {module.examplePhotoUrls.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="font-heading text-xl font-semibold text-zinc-900">
              Ảnh mẫu
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {module.examplePhotoUrls.map((url, i) => (
                <div
                  key={url + i}
                  className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 fade-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <img
                    src={url}
                    alt={`Ảnh mẫu ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Assignment */}
        {module.assignmentPrompt && (
          <section className="mt-10 rounded-xl bg-zinc-50 p-6 ring-1 ring-zinc-100">
            <h2 className="font-heading text-lg font-semibold text-zinc-900">
              Bài tập
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm text-zinc-700">
              {module.assignmentPrompt}
            </p>
          </section>
        )}

        {/* Inline uploader — shown when module has an assignment */}
        {module.assignmentPrompt && (
          <section className="mt-8">
            <PhotoUploadContainer
              moduleId={module.id}
              onUploadComplete={handleUploadComplete}
            />
          </section>
        )}

        {/* Submissions */}
        <section className="mt-12">
          <ModuleSubmissions moduleId={module.id} />
        </section>
      </div>

      {/* Back to top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Lên đầu trang"
          className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-all hover:bg-zinc-800"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </article>
  )
}
