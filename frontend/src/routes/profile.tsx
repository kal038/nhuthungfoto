import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import { useUserProfile } from '@/hooks/queries/useUserProfile'
import { useUpdateProfileMutation } from '@/hooks/mutations/useUpdateProfileMutation'
import { ProfileForm, AccountLayout } from '@/components/features/profile'
import type { ProfileFormData, ProfileFormErrors } from '@/components/features/profile'

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
  }, [authLoading, user, navigate])

  const userId = user?.id ?? ''

  const { data: profile, isLoading: profileLoading } = useUserProfile(userId)
  const updateMutation = useUpdateProfileMutation()

  const loading = authLoading || profileLoading

  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    email: '',
    phone: '',
    skillLevel: 'BEGINNER',
    avatarUrl: null,
  })

  const [errors, setErrors] = useState<ProfileFormErrors>({})

  useEffect(() => {
    if (profile && user) {
      setFormData({
        fullName: profile.full_name ?? '',
        email: user.email ?? '',
        phone: profile.phone ?? '',
        skillLevel: profile.skill_level ?? 'BEGINNER',
        avatarUrl: profile.avatar_url ?? user.user_metadata?.avatar_url ?? null,
      })
    }
  }, [profile, user])

  const isDirty = useMemo(() => {
    if (!profile || !user) return false
    return (
      formData.fullName !== (profile.full_name ?? '') ||
      formData.phone !== (profile.phone ?? '') ||
      formData.avatarUrl !== (profile.avatar_url ?? user.user_metadata?.avatar_url ?? null)
    )
  }, [formData, profile, user])

  const validate = useCallback((): boolean => {
    const nextErrors: ProfileFormErrors = {}

    if (formData.fullName && formData.fullName.length < 2) {
      nextErrors.fullName = 'Tên phải có ít nhất 2 ký tự'
    }

    if (formData.phone && formData.phone !== '') {
      if (!/^0\d{9}$/.test(formData.phone)) {
        nextErrors.phone = 'Số điện thoại không hợp lệ'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [formData])

  const handleChange = useCallback((field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      if (field === 'fullName' || field === 'phone') {
        const next = { ...prev }
        delete next[field]
        return next
      }
      return prev
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!validate()) return

    const payload: { fullName?: string; phone?: string; avatarUrl?: string } = {}
    if (formData.fullName !== (profile?.full_name ?? '')) {
      payload.fullName = formData.fullName
    }
    if (formData.phone !== (profile?.phone ?? '')) {
      payload.phone = formData.phone
    }
    const originalAvatarUrl = profile?.avatar_url ?? user?.user_metadata?.avatar_url ?? null
    if (formData.avatarUrl !== originalAvatarUrl) {
      payload.avatarUrl = formData.avatarUrl ?? ''
    }

    if (Object.keys(payload).length === 0) return

    updateMutation.mutate(payload)
  }, [formData, profile, user?.user_metadata?.avatar_url, validate, updateMutation])

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
        data={formData}
        errors={errors}
        isSaving={updateMutation.isPending}
        isDirty={isDirty}
        onChange={handleChange}
        onSubmit={handleSubmit}
      />
    </AccountLayout>
  )
}
