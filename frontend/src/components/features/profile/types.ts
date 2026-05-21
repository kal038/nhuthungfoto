export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export interface ProfileFormData {
  fullName: string
  email: string
  phone: string
  skillLevel: SkillLevel
  avatarUrl: string | null
}

export interface ProfileFormErrors {
  fullName?: string
  phone?: string
}

export interface ProfileFormProps {
  defaultValues: ProfileFormData
  isSaving?: boolean
  onSubmit: (data: ProfileFormData) => void
}
