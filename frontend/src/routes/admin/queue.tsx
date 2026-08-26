import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Inbox } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useIsAdmin } from '@/hooks/queries/useIsAdmin'
import { useAdminQueue } from '@/hooks/queries/useAdminQueue'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useCreditBalance } from '@/hooks/queries/useCredits'
import { AccountLayout } from '@/components/features/profile'
import { AdminSubmissionCard, AdminAccessDenied } from '@/components/features/admin'
import { LoadingScreen } from '@/components/ui/loading-dots'

export const Route = createFileRoute('/admin/queue')({
  component: AdminQueueRouteContainer,
})

function AdminQueueRouteContainer() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [authLoading, user])

  const { data: profile } = useUserProfile()
  const { data: balance } = useCreditBalance()
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin()
  const { data: queue, isLoading: queueLoading, error } = useAdminQueue()

  if (authLoading || isAdminLoading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  // Explicit admin gate — non-admins get a clear refusal instead of an
  // empty page.
  if (isAdmin === false) {
    return <AdminAccessDenied />
  }

  const submissions = queue?.submissions ?? []

  return (
    <AccountLayout username={profile?.username} creditBalance={balance}>
      <div className="fade-in space-y-6">
        <header className="flex items-baseline justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-zinc-900">
              Chấm bài
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Các bài nộp đang chờ bạn nhận xét, sắp xếp theo thứ tự cũ nhất trước.
            </p>
          </div>
          {submissions.length > 0 && (
            <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium tabular-nums text-zinc-700">
              {submissions.length} bài chờ
            </span>
          )}
        </header>

        {queueLoading ? (
          <LoadingScreen />
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-6 text-center text-red-600">
            Không thể tải hàng chờ. Vui lòng thử lại sau.
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-12 text-center">
            <Inbox className="h-12 w-12 text-zinc-300" />
            <h3 className="mt-4 text-base font-semibold text-zinc-900">
              Hàng chờ trống
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Không có bài nộp nào đang chờ chấm.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {submissions.map((item) => (
              <AdminSubmissionCard
                key={item.id}
                item={item}
                onSelect={() =>
                  navigate({ to: '/admin/grade/$id', params: { id: item.id } })
                }
              />
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  )
}
