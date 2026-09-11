import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { ModuleListResponse } from '@/types/modules'

export async function getModules(): Promise<ModuleListResponse> {
  return apiFetch<ModuleListResponse>('/modules')
}

export function useModules() {
  return useQuery<ModuleListResponse>({
    queryKey: queryKeys.modules.lists(),
    queryFn: getModules,
    staleTime: 5 * 60 * 1000,
  })
}
