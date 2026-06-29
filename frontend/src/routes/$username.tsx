import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useUserProfileByUsername } from '@/hooks/queries/useUserProfileByUsername'
import { useUserSubmissions } from '@/hooks/queries/useUserSubmissions'
import { AccountLayout, ProfileAvatar } from '@/components/features/profile'

export const Route = createFileRoute('/$username')({
  component: UserPortfolioPage,
})

function UserPortfolioPage() {
  const { username } = Route.useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [authLoading, user, navigate])

  const { data: ownerProfile, isLoading: profileLoading } = useUserProfileByUsername(username)
  const { data: submissions, isLoading: submissionsLoading } = useUserSubmissions(username)

  const isOwnProfile = user?.id === ownerProfile?.id

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-zinc-400 text-sm">Đang tải...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AccountLayout>
      <div className="flex flex-col gap-8">
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
            <p className="text-sm text-zinc-400">
              {submissions?.length ?? 0} ảnh
            </p>
          </div>
        </div>

        {/* Navigation for own profile */}
        {isOwnProfile && (
          <div className="flex gap-4">
            <Link
              to="/upload"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              Tải ảnh lên
            </Link>
          </div>
        )}

        {/* Grid */}
        {submissionsLoading || profileLoading ? (
          <p className="text-zinc-400">Đang tải ảnh...</p>
        ) : !submissions?.length ? (
          <p className="text-zinc-500">Chưa có ảnh nào.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100"
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
