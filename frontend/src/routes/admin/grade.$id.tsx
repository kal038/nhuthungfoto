import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useIsAdmin } from '@/hooks/queries/useIsAdmin'
import {
  useAdminSubmission,
  type AdminQueueResponse,
} from '@/hooks/queries/useAdminQueue'
import { useSubmitReviewMutation } from '@/hooks/mutations/useSubmitReview'
import { AccountLayout } from '@/components/features/profile'
import { AdminGradingForm, AdminAccessDenied } from '@/components/features/admin'
import { LoadingScreen } from '@/components/ui/loading-dots'
import { ApiError } from '@/lib/errors'

export const Route = createFileRoute('/admin/grade/$id')({
  component: AdminGradeRouteContainer,
})

function AdminGradeRouteContainer() {
  const { id } = Route.useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [authLoading, user])

  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const {
    data: submission,
    isLoading: submissionLoading,
    error: submissionError,
  } = useAdminSubmission(id)
  const submitReview = useSubmitReviewMutation()

  // Neighbor ids are computed ONCE per id at render time from the cached queue.
  // The mutation invalidates the queue cache on success — re-reading it after
  // submit would race the refetch and break navigation, so we never do.
  const neighbors = useMemo(() => {
    const cached = queryClient.getQueryData<AdminQueueResponse>(['admin', 'queue'])
    const ids = (cached?.submissions ?? []).map((s) => s.id)
    const index = ids.indexOf(id)
    return {
      prevId: index > 0 ? ids[index - 1] : null,
      nextId: index >= 0 && index < ids.length - 1 ? ids[index + 1] : null,
    }
  }, [queryClient, id])

  if (authLoading || isAdminLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  if (isAdmin === false) {
    return <AdminAccessDenied />
  }

  const notAwaiting =
    submissionError instanceof ApiError &&
    (submissionError.status === 404 || submissionError.status === 409)

  const navigateToId = (targetId: string) =>
    navigate({ to: '/admin/grade/$id', params: { id: targetId } })

  return (
    <AccountLayout>
      <div className="fade-in space-y-6">
        {/* Top bar: back + prev/next */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/admin/queue' })}>
            <ArrowLeft className="h-4 w-4" />
            Hàng chờ
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              disabled={!neighbors.prevId}
              onClick={() => neighbors.prevId && navigateToId(neighbors.prevId)}
              aria-label="Bài trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!neighbors.nextId}
              onClick={() => neighbors.nextId && navigateToId(neighbors.nextId)}
              aria-label="Bài sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {submissionLoading ? (
          <LoadingScreen />
        ) : notAwaiting ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-12 text-center">
            <h3 className="text-base font-semibold text-zinc-900">
              Bài nộp không còn chờ chấm
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Bài này đã được chấm hoặc không tồn tại.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => navigate({ to: '/admin/queue' })}>
              Về hàng chờ
            </Button>
          </div>
        ) : submission ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Photo */}
            <div className="lg:col-span-3">
              <div className="overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
                {submission.photoUrl ? (
                  <img
                    src={submission.photoUrl}
                    alt={`Bài nộp của ${submission.student.username ?? 'học viên'}`}
                    className="max-h-[70vh] w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center text-sm text-zinc-400">
                    Không có ảnh
                  </div>
                )}
              </div>
            </div>

            {/* Info + grading form */}
            <div className="space-y-6 lg:col-span-2">
              <div className="space-y-1 rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-100">
                <p className="font-semibold text-zinc-900">
                  {submission.student.username ?? 'Không tên'}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {submission.student.email}
                  </span>
                </p>
                <p className="text-sm text-zinc-500">
                  Bài học: {submission.module.title ?? '—'}
                </p>
                <p className="text-sm text-zinc-500">
                  Trình độ: {submission.student.skillLevel?.toLowerCase() ?? '—'}
                </p>
                <p className="text-xs tabular-nums text-zinc-400">
                  Nộp lúc{' '}
                  {new Date(submission.createdAt).toLocaleString('vi-VN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {' · '}
                  Chờ {submission.waitingDays} ngày
                </p>
              </div>

              <AdminGradingForm
                isPending={submitReview.isPending}
                isError={submitReview.isError}
                onSubmit={(values) =>
                  submitReview.mutate(
                    { submissionId: id, ...values },
                    {
                      onSuccess: () => {
                        // Precomputed at render time — never re-read the queue
                        // cache after submit (it is being refetched).
                        if (neighbors.nextId) {
                          navigateToId(neighbors.nextId)
                        } else {
                          navigate({ to: '/admin/queue' })
                        }
                      },
                    },
                  )
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    </AccountLayout>
  )
}
