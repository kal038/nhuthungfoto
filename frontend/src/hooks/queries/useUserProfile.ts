import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import type { Tables } from '@/types/database.types'

export type UserProfile = Tables<'profiles'>

async function fetchUserProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('profile', undefined, 'GET')
}

export function useUserProfile() {
  return useAuthQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: fetchUserProfile,
    staleTime: 15 * 60 * 1000,
  })
}
