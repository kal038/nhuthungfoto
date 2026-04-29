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
  data: ProfileFormData
  errors?: ProfileFormErrors
  isSaving?: boolean
  isDirty?: boolean
  onChange: (field: keyof ProfileFormData, value: string) => void
  onSubmit: () => void
}
