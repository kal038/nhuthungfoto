import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'

export interface Submission {
  id: string
  moduleId: string | null
  status: string
  reviewType: string | null
  createdAt: string
  originalPhotoUrl: string | null
  processedPhotoUrl: string | null
}

export async function getSubmissions(): Promise<Submission[]> {
  const res = await apiFetch<{ submissions: Submission[] }>('/submissions/me')
  return res.submissions
}

export function useSubmissions() {
  return useAuthQuery<Submission[]>({
    queryKey: ['submissions'],
    queryFn: getSubmissions,
    staleTime: 5 * 60 * 1000,
  })
}
