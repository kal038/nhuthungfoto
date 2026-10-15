import { useAuthQuery } from '@/hooks/useAuthQuery'
import { apiFetch } from '@/lib/apiFetch'
import { queryKeys } from '@/lib/queryKeys'
import type { Booking, BookingsResponse } from '@/types/booking'

async function fetchBookings(): Promise<Booking[]> {
  const res = await apiFetch<BookingsResponse>('/bookings')
  return res.bookings
}

/** The current student's lesson bookings (newest start time first). */
export function useBookings() {
  return useAuthQuery<Booking[]>({
    queryKey: queryKeys.bookings.list(),
    queryFn: fetchBookings,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  })
}
