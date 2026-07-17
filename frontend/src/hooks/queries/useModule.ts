import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import { ApiError } from '@/lib/errors'
import type { ModuleDetail } from '@/types/modules'

export async function getModule(slug: string): Promise<ModuleDetail> {
  return apiFetch<ModuleDetail>(`/modules/${slug}`, undefined, 'GET')
}

export function useModule(slug: string) {
  return useQuery<ModuleDetail>({
    queryKey: ['module', slug],
    queryFn: () => getModule(slug),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      return failureCount < 3
    },
  })
}
