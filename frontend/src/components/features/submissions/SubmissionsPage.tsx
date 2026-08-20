import { useState, useMemo } from 'react'
import { Clock, CheckCircle2, UploadCloud, Inbox } from 'lucide-react'
import { useSubmissions, type Submission } from '@/hooks/queries/useSubmissions'
import { SubmissionCard } from './SubmissionCard'
import { ReviewDetailDialog } from '@/components/features/reviews'
import { GradeConfirmDialog } from '@/components/features/credits/GradeConfirmDialog'
import { LoadingDots } from '@/components/ui/loading-dots'

export function SubmissionsPage() {
  const { data: submissions, isLoading, error } = useSubmissions()

  const [reviewTarget, setReviewTarget] = useState<Submission | null>(null)
  const [gradeTarget, setGradeTarget] = useState<Submission | null>(null)

  const { pendingSubmissions, completedSubmissions, uploadedSubmissions } =
    useMemo(() => {
      const list = submissions ?? []

      const pending = list
        .filter((s) => s.status === 'GRADING' || s.status === 'AWAITING_HUNG')
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ) // Oldest first

      const completed = list
        .filter((s) => s.status === 'COMPLETED')
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ) // Newest first

      const uploaded = list
        .filter((s) => s.status === 'UPLOADED' || s.status === 'FAILED')
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ) // Newest first

      return {
        pendingSubmissions: pending,
        completedSubmissions: completed,
        uploadedSubmissions: uploaded,
      }
    }, [submissions])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingDots />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center text-red-600">
        Đã xảy ra lỗi khi tải danh sách bài nộp. Vui lòng thử lại sau.
      </div>
    )
  }

  const hasSubmissions =
    pendingSubmissions.length > 0 ||
    completedSubmissions.length > 0 ||
    uploadedSubmissions.length > 0

  return (
    <div className="space-y-10 fade-in">
      <header>
        <h1 className="font-heading text-2xl font-bold text-zinc-900">
          Bài nộp của tôi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Theo dõi tiến độ chấm bài và xem kết quả đánh giá ảnh của bạn.
        </p>
      </header>

      {!hasSubmissions ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-12 text-center">
          <Inbox className="h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-base font-semibold text-zinc-900">
            Chưa có bài nộp nào
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Các bức ảnh bạn nộp trong các bài học sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* 1. Chờ chấm (Pending - oldest first) */}
          {pendingSubmissions.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                <h2 className="font-heading text-lg font-semibold text-zinc-900">
                  Chờ chấm ({pendingSubmissions.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {pendingSubmissions.map((sub) => (
                  <SubmissionCard key={sub.id} submission={sub} />
                ))}
              </div>
            </section>
          )}

          {/* 2. Đã chấm (Completed - newest first) */}
          {completedSubmissions.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h2 className="font-heading text-lg font-semibold text-zinc-900">
                  Đã chấm ({completedSubmissions.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {completedSubmissions.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    submission={sub}
                    onSelectReview={(s) => setReviewTarget(s)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* 3. Chưa gửi chấm (Uploaded/Failed - newest first) */}
          {uploadedSubmissions.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-blue-500" />
                <h2 className="font-heading text-lg font-semibold text-zinc-900">
                  Chưa gửi chấm ({uploadedSubmissions.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {uploadedSubmissions.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    submission={sub}
                    onSelectGrade={(s) => setGradeTarget(s)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Review Dialog */}
      <ReviewDetailDialog
        submission={reviewTarget}
        open={!!reviewTarget}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null)
        }}
      />

      {/* Grade Confirm Dialog */}
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
    </div>
  )
}
