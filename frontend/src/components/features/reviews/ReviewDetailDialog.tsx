import { ImageOff, Star, Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { LoadingDots } from '@/components/ui/loading-dots'
import { useReview } from '@/hooks/queries/useReview'
import { CATEGORY_KEYS, CATEGORY_LABELS } from '@/lib/grading'
import type { Submission } from '@/hooks/queries/useSubmissions'

export interface ReviewDetailDialogProps {
  submission: Submission | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReviewDetailDialog({ submission, open, onOpenChange }: ReviewDetailDialogProps) {
  const { data: review, isLoading, error } = useReview(submission?.id ?? '', open && !!submission)

  const photoUrl = submission?.processedPhotoUrl ?? submission?.originalPhotoUrl ?? null

  const formattedDate = review?.reviewedAt
    ? new Date(review.reviewedAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Chi tiết đánh giá</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Photo */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted shadow-inner">
            {photoUrl ? (
              <img src={photoUrl} alt="Ảnh đã nộp" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground/60">
                <ImageOff className="h-10 w-10" />
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingDots />
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-600">
              Không thể tải kết quả đánh giá. Vui lòng thử lại sau.
            </div>
          ) : review ? (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="flex items-center justify-between rounded-xl bg-muted p-4 ring-1 ring-border">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Điểm tổng kết</p>
                  {formattedDate && (
                    <div className="mt-1 flex items-center text-xs text-muted-foreground">
                      <Calendar className="mr-1 h-3.5 w-3.5" />
                      {formattedDate}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 font-heading text-2xl font-bold text-amber-600">
                  <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
                  <span>{review.overallScore != null ? review.overallScore : '—'}</span>
                  <span className="text-xs font-normal text-amber-600/70">/10</span>
                </div>
              </div>

              {/* 5 Category Bars */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Chi tiết tiêu chí</h4>
                <div className="grid gap-3.5 rounded-xl bg-muted p-4 ring-1 ring-border">
                  {CATEGORY_KEYS.map((key) => {
                    const score = review.categoryScores?.[key] ?? 0
                    const label = CATEGORY_LABELS[key]
                    const percentage = Math.min(100, Math.max(0, score * 10))

                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-foreground/80">{label}</span>
                          <span className="font-semibold tabular-nums text-foreground">
                            {score} / 10
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Comments */}
              {review.comments && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Nhận xét của giảng viên</h4>
                  <div className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground/80 shadow-sm">
                    {review.comments}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
