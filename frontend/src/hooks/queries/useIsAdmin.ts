import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'

export interface IsAdminResponse {
  isAdmin: boolean
}

async function fetchIsAdmin(): Promise<boolean> {
  const res = await apiFetch<IsAdminResponse>('/admin/me', undefined, 'GET')
  return res.isAdmin //returns True if admin, False otherwise
}

export function useIsAdmin() {
  return useAuthQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: fetchIsAdmin,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  })
}
