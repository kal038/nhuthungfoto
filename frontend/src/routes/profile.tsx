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

  const userId = user?.id ?? ''

  const { data: profile, isLoading: profileLoading } = useUserProfile(userId)
  const updateMutation = useUpdateProfileMutation()

  const loading = authLoading || profileLoading

  const defaultValues = useMemo<ProfileFormData>(
    () => ({
      fullName: profile?.full_name ?? '',
      email: user?.email ?? '',
      phone: profile?.phone ?? '',
      skillLevel: profile?.skill_level ?? 'BEGINNER',
      avatarUrl: profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null,
    }),
    [profile, user],
  )

  const handleSave = useCallback(
    (formData: ProfileFormData) => {
      const payload: { fullName?: string; phone?: string; avatarUrl?: string } = {}
      if (formData.fullName !== (profile?.full_name ?? '')) {
        payload.fullName = formData.fullName
      }
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
        <p className="text-zinc-400 text-sm">Đang tải...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AccountLayout>
      <ProfileForm
        key={user.id}
        defaultValues={defaultValues}
        isSaving={updateMutation.isPending}
        saveError={updateMutation.error}
        isSaveSuccess={updateMutation.isSuccess}
        onSubmit={handleSave}
      />
    </AccountLayout>
  )
}
