import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import type { ModuleListResponse } from '@/types/modules'

export async function getModules(): Promise<ModuleListResponse> {
  return apiFetch<ModuleListResponse>('/modules', undefined, 'GET')
}

export function useModules() {
  return useQuery<ModuleListResponse>({
    queryKey: ['modules'],
    queryFn: getModules,
    staleTime: 5 * 60 * 1000,
  })
}
