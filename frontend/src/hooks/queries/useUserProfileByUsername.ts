import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'

export interface UserProfileByUsername {
  id: string
  username: string
  avatar_url: string | null
  skill_level: string | null
}

export async function getUserProfileByUsername(username: string): Promise<UserProfileByUsername> {
  const res = await apiFetch<UserProfileByUsername>(`/profile/${username}`, undefined, 'GET')
  return res
}

export function useUserProfileByUsername(username: string) {
  return useQuery<UserProfileByUsername>({
    queryKey: ['user-profile', 'username', username],
    queryFn: () => getUserProfileByUsername(username),
    staleTime: 5 * 60 * 1000,
    enabled: !!username,
  })
}
