/**
 * Booking types — the frontend mirror of GET /v1/bookings
 * (backend/src/routes/bookings.ts). Cal.com owns availability and policy; the
 * app only mirrors the student's sessions.
 */

export type BookingStatus = 'ACCEPTED' | 'PENDING' | 'CANCELLED'

export interface Booking {
  uid: string
  startTime: string
  status: BookingStatus
  meetUrl: string | null
}

export interface BookingsResponse {
  bookings: Booking[]
}
