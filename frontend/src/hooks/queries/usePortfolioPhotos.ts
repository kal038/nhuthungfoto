import { useQuery } from '@tanstack/react-query'
import type { PortfolioPhoto, PortfolioListResponse } from '@/types/portfolio'
import { queryKeys } from '@/lib/queryKeys'

const API_URL = import.meta.env.VITE_API_URL as string

export async function getPortfolioPhotos(): Promise<PortfolioPhoto[]> {
  const res = await fetch(`${API_URL}/portfolio`)
  if (!res.ok) throw new Error('Failed to fetch portfolio photos')
  const data: PortfolioListResponse = await res.json()
  return data.photos
}

export function usePortfolioPhotos() {
  return useQuery<PortfolioPhoto[]>({
    queryKey: queryKeys.portfolioPhotos.lists(),
    queryFn: getPortfolioPhotos,
    staleTime: 15 * 60 * 1000,
  })
}
