import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProfileAvatar } from './ProfileAvatar'
import { ProfileField } from './ProfileField'
import { CheckCircle } from 'lucide-react'
import type { ProfileFormProps, ProfileFormData, ProfileFormErrors } from './types'

const skillLabelMap: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

export function ProfileForm({
  defaultValues,
  isSaving,
  onSubmit,
}: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>(defaultValues)
  const [errors, setErrors] = useState<ProfileFormErrors>({})
  const [originalValues] = useState<ProfileFormData>(defaultValues)

  const displayName = formData.fullName || formData.email.split('@')[0] || 'User'

  const isDirty = useMemo(() => {
    return (
      formData.fullName !== originalValues.fullName ||
      formData.phone !== originalValues.phone ||
      formData.avatarUrl !== originalValues.avatarUrl
    )
  }, [formData, originalValues])

  const validate = useCallback((): boolean => {
    const next: ProfileFormErrors = {}

    if (formData.fullName && formData.fullName.length < 2) {
      next.fullName = 'Tên phải có ít nhất 2 ký tự'
    }

    if (formData.phone && formData.phone !== '') {
      if (!/^0\d{9}$/.test(formData.phone)) {
        next.phone = 'Số điện thoại không hợp lệ'
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
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

  const handleAvatarChange = useCallback(() => {
    const url = window.prompt('Enter avatar URL:', formData.avatarUrl ?? '')
    if (url !== null) {
      handleChange('avatarUrl', url)
    }
  }, [formData.avatarUrl, handleChange])

  const handleSubmit = useCallback(() => {
    if (!validate()) return
    onSubmit(formData)
  }, [formData, validate, onSubmit])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 font-heading">
          Chỉnh sửa hồ sơ
        </h1>
        <Badge
          variant="secondary"
          className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200"
        >
          <CheckCircle className="h-3 w-3" />
          Đã xác nhận
        </Badge>
      </div>

      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <ProfileAvatar url={formData.avatarUrl} name={displayName} size="xl" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-900">
            {displayName}
          </span>
          <button
            type="button"
            onClick={handleAvatarChange}
            className="text-sm text-zinc-500 underline underline-offset-2 decoration-zinc-300 hover:text-zinc-900 hover:decoration-zinc-500 transition-colors duration-150"
          >
            Đổi ảnh hồ sơ
          </button>
        </div>
      </div>

      <hr className="border-zinc-100" />

      {/* Basic Information */}
      <div className="space-y-6">
        <h2 className="text-base font-semibold text-zinc-900 font-heading">
          Thông tin cơ bản
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProfileField label="Họ và tên" error={errors?.fullName}>
            <Input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
              className="h-10 rounded-lg border-zinc-200 bg-white font-body text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-all duration-200"
            />
          </ProfileField>

          <ProfileField label="Trình độ">
            <div className="flex items-center h-10 px-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-sm text-zinc-700 font-body">
                {skillLabelMap[formData.skillLevel] || formData.skillLevel}
              </span>
            </div>
          </ProfileField>
        </div>

        <ProfileField label="Email">
          <Input
            type="email"
            value={formData.email}
            disabled
            className="h-10 rounded-lg border-zinc-200 bg-zinc-50 font-body text-sm text-zinc-500 cursor-not-allowed"
          />
        </ProfileField>

        <ProfileField label="Số điện thoại" error={errors?.phone}>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="0912345678"
            className="h-10 rounded-lg border-zinc-200 bg-white font-body text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-all duration-200"
          />
        </ProfileField>
      </div>

      <hr className="border-zinc-100" />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="button"
          disabled={!isDirty || isSaving}
          onClick={handleSubmit}
          className="h-10 px-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>
    </div>
  )
}
