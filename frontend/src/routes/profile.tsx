import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useUpdateProfileMutation } from '@/hooks/mutations/useUpdateProfileMutation'
import { ProfileForm, AccountLayout } from '@/components/features/profile'
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

  const { data: profile, isLoading: profileLoading } = useUserProfile()
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

  return (
    <AccountLayout>
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
