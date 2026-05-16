import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProfileAvatar } from './ProfileAvatar'
import { ProfileField } from './ProfileField'
import { CheckCircle } from 'lucide-react'
import type { ProfileFormProps } from './types'

const skillLabelMap: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

export function ProfileForm({
  data,
  errors,
  isSaving,
  isDirty,
  onChange,
  onSubmit,
}: ProfileFormProps) {
  const displayName = data.fullName || data.email.split('@')[0] || 'User'

  const handleAvatarChange = useCallback(() => {
    const url = window.prompt('Enter avatar URL:', data.avatarUrl ?? '')
    if (url !== null) {
      onChange('avatarUrl', url)
    }
  }, [data.avatarUrl, onChange])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-zinc-900 font-heading">Chỉnh sửa hồ sơ</h1>
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
        <ProfileAvatar url={data.avatarUrl} name={displayName} size="xl" />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-900">{displayName}</span>
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
        <h2 className="text-base font-semibold text-zinc-900 font-heading">Thông tin cơ bản</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ProfileField label="Họ và tên" error={errors?.fullName}>
            <Input
              type="text"
              value={data.fullName}
              onChange={(e) => onChange('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
              className="h-10 rounded-lg border-zinc-200 bg-white font-body text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-all duration-200"
            />
          </ProfileField>

          <ProfileField label="Trình độ">
            <div className="flex items-center h-10 px-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="text-sm text-zinc-700 font-body">
                {skillLabelMap[data.skillLevel] || data.skillLevel}
              </span>
            </div>
          </ProfileField>
        </div>

        <ProfileField label="Email">
          <Input
            type="email"
            value={data.email}
            disabled
            className="h-10 rounded-lg border-zinc-200 bg-zinc-50 font-body text-sm text-zinc-500 cursor-not-allowed"
          />
        </ProfileField>

        <ProfileField label="Số điện thoại" error={errors?.phone}>
          <Input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
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
          onClick={onSubmit}
          className="h-10 px-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>
    </div>
  )
}
