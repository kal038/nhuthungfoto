import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ProfileAvatar } from './ProfileAvatar'
import { ProfileField } from './ProfileField'
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-6"
    >
      {/* Header: Avatar + Name */}
      <div className="flex flex-col items-center gap-3">
        <ProfileAvatar url={data.avatarUrl} name={displayName} size="lg" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-zinc-900 font-heading">
            {displayName}
          </h2>
          <Badge variant="secondary" className="mt-1 capitalize">
            {skillLabelMap[data.skillLevel] || data.skillLevel}
          </Badge>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <ProfileField label="Full Name" error={errors?.fullName}>
          <Input
            type="text"
            value={data.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            placeholder="Your full name"
            className="h-11 rounded-lg border-zinc-200 bg-white font-body text-base text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-all duration-200"
          />
        </ProfileField>

        <ProfileField label="Email">
          <Input
            type="email"
            value={data.email}
            disabled
            className="h-11 rounded-lg border-zinc-200 bg-zinc-50 font-body text-base text-zinc-500 cursor-not-allowed"
          />
        </ProfileField>

        <ProfileField label="Phone Number" error={errors?.phone}>
          <Input
            type="tel"
            value={data.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            placeholder="e.g. 0912345678"
            className="h-11 rounded-lg border-zinc-200 bg-white font-body text-base text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 transition-all duration-200"
          />
        </ProfileField>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!isDirty || isSaving}
        className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
