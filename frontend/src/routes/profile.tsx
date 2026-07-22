import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useCreditBalance } from '@/hooks/queries/useCredits'
import { useUpdateProfileMutation } from '@/hooks/mutations/useUpdateProfileMutation'
import { ProfileForm, AccountLayout } from '@/components/features/profile'
import { LoadingScreen } from '@/components/ui/loading-dots'
import type { ProfileFormData } from '@/components/features/profile'

export const Route = createFileRoute('/profile')({
  component: ProfileContainer,
})

function ProfileContainer() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: '/login' })
    }
  }, [authLoading, user])

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useUserProfile()
  const { data: balance } = useCreditBalance()
  const updateMutation = useUpdateProfileMutation()

  const loading = authLoading || profileLoading

  const defaultValues = useMemo<ProfileFormData>(
    () => ({
      username: profile?.username ?? '',
      email: user?.email ?? '',
      phone: profile?.phone ?? '',
      skillLevel: profile?.skill_level ?? 'BEGINNER',
      avatarUrl: profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null,
    }),
    [profile, user],
  )

  const handleSave = useCallback(
    (formData: ProfileFormData) => {
      const payload: { phone?: string; avatarUrl?: string } = {}
      if (formData.phone !== (profile?.phone ?? '')) {
        payload.phone = formData.phone
      }
      const originalAvatar = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null
      if (formData.avatarUrl !== originalAvatar) {
        payload.avatarUrl = formData.avatarUrl ?? ''
      }
      if (Object.keys(payload).length === 0) return
      updateMutation.mutate(payload)
    },
    [profile, user, updateMutation],
  )

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  if (profileError) {
    return (
      <AccountLayout username={profile?.username} creditBalance={balance}>
        <div className="flex flex-col items-center justify-center rounded-xl bg-red-50 p-8 text-center ring-1 ring-red-100">
          <div className="mb-4 rounded-full bg-red-100 p-3">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-900">Không tải được hồ sơ</h3>
          <p className="mt-2 text-sm text-red-700 max-w-md">
            Đã có lỗi xảy ra khi tải thông tin hồ sơ của bạn. Vui lòng thử lại sau.
          </p>
          <button
            onClick={() => refetchProfile()}
            className="mt-6 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Thử lại
          </button>
        </div>
      </AccountLayout>
    )
  }

  return (
    <AccountLayout username={profile?.username} creditBalance={balance}>
      <div className="fade-in">
        <ProfileForm
          key={`${user.id}-${profile?.updated_at}`}
          defaultValues={defaultValues}
          isSaving={updateMutation.isPending}
          saveError={updateMutation.error}
          isSaveSuccess={updateMutation.isSuccess}
          onSubmit={handleSave}
        />
      </div>
    </AccountLayout>
  )
}

