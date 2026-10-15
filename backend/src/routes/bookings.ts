import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase'
import { listUserBookings } from '@/services/bookings'
import type { UserBooking } from '@/services/bookings'

/** GET /v1/bookings response. */
export interface BookingsResponse {
  bookings: UserBooking[]
}

const bookingsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

// GET /v1/bookings — the current student's lesson bookings, newest first.
bookingsRouter.get('/', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const bookings = await listUserBookings(supabase, userId)

  const response: BookingsResponse = { bookings }
  return c.json(response, 200)
})

export { bookingsRouter }
