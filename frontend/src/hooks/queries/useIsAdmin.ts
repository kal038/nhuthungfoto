import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'

export interface IsAdminResponse {
  isAdmin: boolean
}

async function fetchIsAdmin(): Promise<boolean> {
  const res = await apiFetch<IsAdminResponse>('/admin/me')
  return res.isAdmin //returns True if admin, False otherwise
}

export function useIsAdmin() {
  return useAuthQuery<boolean>({
    queryKey: queryKeys.admin.access(),
    queryFn: fetchIsAdmin,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  })
}
