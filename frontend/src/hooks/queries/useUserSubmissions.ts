import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'

export interface UserSubmission {
  id: string
  moduleId: string | null
  status: string
  reviewType: string | null
  createdAt: string
  originalPhotoUrl: string | null
  processedPhotoUrl: string | null
}

export async function getUserSubmissions(username: string): Promise<UserSubmission[]> {
  const res = await apiFetch<{ submissions: UserSubmission[] }>(
    `/submissions/user/${username}`,
    undefined,
    'GET',
  )
  return res.submissions
}

export function useUserSubmissions(username: string) {
  return useQuery<UserSubmission[]>({
    queryKey: ['user-submissions', username],
    queryFn: () => getUserSubmissions(username),
    staleTime: 5 * 60 * 1000,
    enabled: !!username,
  })
}
