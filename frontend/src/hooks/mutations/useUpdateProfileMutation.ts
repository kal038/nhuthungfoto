import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { UserProfile } from '@/hooks/queries/useUserProfile'

interface UpdateProfileBody {
  phone?: string
  avatarUrl?: string
}

export async function updateProfile(body: UpdateProfileBody): Promise<UserProfile> {
  return apiFetch('profile', { body, method: 'PATCH' })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation<UserProfile, Error, UpdateProfileBody>({
    mutationFn: updateProfile,
    onSuccess: () => {
      // Invalidate the profile query so it refetches
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.current() })
    },
  })
}
