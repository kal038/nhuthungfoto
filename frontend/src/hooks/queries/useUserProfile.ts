import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { Tables } from '@/types/database.types'

export type UserProfile = Tables<'profiles'>

async function fetchUserProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('profile')
}

export function useUserProfile() {
  return useAuthQuery<UserProfile>({
    queryKey: queryKeys.profiles.current(),
    queryFn: fetchUserProfile,
    staleTime: 15 * 60 * 1000,
  })
}
