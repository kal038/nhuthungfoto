import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useUpdateProfileMutation } from '@/hooks/mutations/useUpdateProfileMutation'
import { ProfileForm } from '@/components/features/profile'
import { ProfileCard } from '@/components/features/profile/ProfileCard'
import type { ProfileFormData, ProfileFormErrors } from '@/components/features/profile'

export const Route = createFileRoute('/profile')({
  component: ProfileContainer,
})

function ProfileContainer() {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id

  const { data: profile, isLoading: profileLoading } = useUserProfile(userId ?? '')
  const updateMutation = useUpdateProfileMutation()

  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    email: '',
    phone: '',
    skillLevel: 'BEGINNER',
    avatarUrl: null,
  })

  const [errors, setErrors] = useState<ProfileFormErrors>({})

  // Sync form data when profile loads
  useEffect(() => {
    if (profile && user) {
      setFormData({
        fullName: profile.full_name ?? '',
        email: user.email ?? '',
        phone: profile.phone ?? '',
        skillLevel: profile.skill_level ?? 'BEGINNER',
        avatarUrl: null,
      })
    }
  }, [profile, user])

  const isDirty = useMemo(() => {
    if (!profile || !user) return false
    return (
      formData.fullName !== (profile.full_name ?? '') || formData.phone !== (profile.phone ?? '')
    )
  }, [formData, profile, user])

  const validate = useCallback((): boolean => {
    const nextErrors: ProfileFormErrors = {}

    if (formData.fullName && formData.fullName.length < 2) {
      nextErrors.fullName = 'Full name must be at least 2 characters'
    }

    if (formData.phone && formData.phone !== '') {
      if (!/^0\d{9}$/.test(formData.phone)) {
        nextErrors.phone = 'Invalid phone number format'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [formData])

  const handleChange = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field on change
    setErrors((prev) => {
      if (field === 'fullName' || field === 'phone') {
        const { [field]: _, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return

    const payload: { fullName?: string; phone?: string } = {}
    if (formData.fullName !== (profile?.full_name ?? '')) {
      payload.fullName = formData.fullName
    }
    if (formData.phone !== (profile?.phone ?? '')) {
      payload.phone = formData.phone
    }

    // Only send if there are actual changes
    if (Object.keys(payload).length === 0) return

    updateMutation.mutate(payload)
  }, [formData, profile, validate, updateMutation])

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-zinc-500">Please sign in to view your profile.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-8 px-4">
      <ProfileCard>
        <ProfileForm
          data={formData}
          errors={errors}
          isSaving={updateMutation.isPending}
          isDirty={isDirty}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </ProfileCard>
    </div>
  )
}
