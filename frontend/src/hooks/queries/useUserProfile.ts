import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'

export type UserProfile = Tables<'profiles'>

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

  if (error) throw error

  return data
}

export function useUserProfile(userId: string) {
  return useQuery<UserProfile>({
    queryKey: userId ? ['user-profile', userId] : ['user-profile', '_none'],
    queryFn: () => getUserProfile(userId),
    staleTime: 15 * 60 * 1000,
    enabled: !!userId,
  })
}
