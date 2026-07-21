import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useCreditBalance } from '@/hooks/queries/useCredits'
import { useGallery } from '@/hooks/queries/useGallery'
import { ApiError } from '@/lib/errors'
import { AccountLayout } from './AccountLayout'
import { ProfileAvatar } from './ProfileAvatar'

interface UserPortfolioPageProps {
  username: string
}

export function UserPortfolioPage({ username }: UserPortfolioPageProps) {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [authLoading, user, navigate])

  const { data: currentProfile } = useUserProfile()
  const { data: balance } = useCreditBalance()
  const { data, isLoading, error } = useGallery(username)
  const ownerProfile = data?.profile
  const submissions = data?.submissions

  const isNotFound =
    !isLoading &&
    (!ownerProfile || (error instanceof ApiError && error.status === 404))

  const isOwnProfile = user?.id === ownerProfile?.id

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex gap-1">
          <span className="loading-dot" />
          <span className="loading-dot" style={{ animationDelay: '0.15s' }} />
          <span className="loading-dot" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (isNotFound) {
    return (
      <AccountLayout username={currentProfile?.username} creditBalance={balance}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h1 className="text-4xl font-bold text-zinc-900">404</h1>
          <p className="mt-2 text-zinc-500">Người dùng @{username} không tồn tại.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </AccountLayout>
    )
  }

  return (
    <AccountLayout username={currentProfile?.username} creditBalance={balance}>
      <div className="flex flex-col gap-8 fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <ProfileAvatar
            url={ownerProfile?.avatar_url ?? null}
            name={ownerProfile?.username ?? username}
            size="lg"
          />
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              @{ownerProfile?.username ?? username}
            </h1>
            {ownerProfile?.skill_level && (
              <p className="text-sm text-zinc-500">{ownerProfile.skill_level}</p>
            )}
            <p className="text-sm text-zinc-400">{submissions?.length ?? 0} ảnh</p>
          </div>
        </div>

        {/* Navigation for own profile */}
        {isOwnProfile && (
          <div className="flex gap-4">
            <Link
              to="/upload"
              search={{ moduleId: undefined }}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Tải ảnh lên
            </Link>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="flex gap-1">
              <span className="loading-dot" />
              <span className="loading-dot" style={{ animationDelay: '0.15s' }} />
              <span className="loading-dot" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        ) : !submissions?.length ? (
          <p className="text-zinc-500">Chưa có ảnh nào.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {submissions.map((sub, i) => (
              <div
                key={sub.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 fade-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <img
                  src={sub.processedPhotoUrl ?? sub.originalPhotoUrl ?? undefined}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  )
}
