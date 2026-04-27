import { useQuery } from '@tanstack/react-query'
import type { PortfolioPhoto, PortfolioListResponse } from '@/types/portfolio'

const BASE_URL = import.meta.env.VITE_R2_PUBLIC_BASE_URL as string
const API_URL = import.meta.env.VITE_API_URL as string

export function usePortfolioPhotos() {
  return useQuery<PortfolioPhoto[]>({
    queryKey: ['portfolio-photos'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/portfolio`)
      if (!res.ok) throw new Error('Failed to fetch portfolio photos')
      const data: PortfolioListResponse = await res.json()
      return data.photos.map((photo) => ({
        key: photo.key,
        url: `${BASE_URL}/${photo.key}`,
        uploaded: photo.uploaded,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

