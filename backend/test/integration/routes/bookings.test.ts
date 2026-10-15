import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { AuthVars } from '@/middleware/auth'
import { bookingsRouter } from '@/routes/bookings'
import type { Env } from '@/types/env'
import { AppError } from '@/lib/errors'
import { listUserBookings } from '@/services/bookings'

vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(() => ({})),
}))

vi.mock('@/services/bookings', () => ({
  listUserBookings: vi.fn(),
}))

describe('Booking Routes', () => {
  let app: Hono<{ Bindings: Env; Variables: { user: AuthVars } }>

  beforeEach(() => {
    vi.clearAllMocks()
    app = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()
    app.use('*', async (c, next) => {
      c.set('user', { id: 'user-123', role: 'authenticated' })
      await next()
    })
    app.onError((err, c) => {
      if (err instanceof AppError) {
        return c.json({ error: err.message }, err.status as ContentfulStatusCode)
      }
      return c.json({ error: 'Internal Server Error' }, 500)
    })
    app.route('/v1/bookings', bookingsRouter)
  })

  it('returns the current user bookings scoped by their id', async () => {
    vi.mocked(listUserBookings).mockResolvedValue([
      {
        uid: 'uid-1',
        startTime: '2026-10-20T10:00:00Z',
        status: 'ACCEPTED',
        meetUrl: 'https://meet.google.com/abc',
      },
    ])

    const response = await app.request('/v1/bookings')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(listUserBookings).toHaveBeenCalledWith(expect.anything(), 'user-123')
    expect(data).toEqual({
      bookings: [
        {
          uid: 'uid-1',
          startTime: '2026-10-20T10:00:00Z',
          status: 'ACCEPTED',
          meetUrl: 'https://meet.google.com/abc',
        },
      ],
    })
  })

  it('returns an empty list for a student with no bookings', async () => {
    vi.mocked(listUserBookings).mockResolvedValue([])

    const response = await app.request('/v1/bookings')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ bookings: [] })
  })
})
