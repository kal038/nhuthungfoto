import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/apiFetch'
import { ApiError } from '@/lib/errors'
import type { GalleryData } from '@/types/gallery'

export async function getGallery(username: string): Promise<GalleryData> {
  return apiFetch<GalleryData>(`/gallery/${username}`, undefined, 'GET')
}

export function useGallery(username: string) {
  return useQuery<GalleryData>({
    queryKey: ['gallery', username],
    queryFn: () => getGallery(username),
    staleTime: 5 * 60 * 1000,
    enabled: !!username,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      return failureCount < 3
    },
  })
}
