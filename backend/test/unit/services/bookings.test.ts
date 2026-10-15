import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import {
  isValidCalcomSignature,
  listUserBookings,
  syncCalcomBooking,
} from '@/services/bookings'
import type { CalcomWebhook } from '@/schema/calcom'

const USER_ID = 'user-uuid-1'
const SECRET = 'calcom-secret'

interface QueryBuilder {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: (resolve: (value: unknown) => unknown) => Promise<unknown>
}

/** Chainable Supabase query-builder stub that resolves to `result` when awaited. */
function makeBuilder(result: { data: unknown; error: unknown }): QueryBuilder {
  const builder = {} as QueryBuilder
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.update = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.upsert = vi.fn(() => builder)
  builder.maybeSingle = vi.fn(async () => result)
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return builder
}

function makeSupabase(overrides: { profile?: { data: unknown; error: unknown } } = {}) {
  const profiles = makeBuilder(overrides.profile ?? { data: { id: USER_ID }, error: null })
  const bookings = makeBuilder({ data: null, error: null })
  const supabase = {
    from: vi.fn((table: string) => (table === 'profiles' ? profiles : bookings)),
  }
  return { supabase, profiles, bookings }
}

const basePayload = {
  uid: 'uid-new',
  startTime: '2026-10-20T10:00:00Z',
  attendees: [{ email: 'Student@Example.com' }],
}

function event(triggerEvent: string, payload: Record<string, unknown>): CalcomWebhook {
  return {
    triggerEvent,
    createdAt: '2026-10-14T00:00:00.000Z',
    payload: { ...basePayload, ...payload },
  } as unknown as CalcomWebhook
}

describe('isValidCalcomSignature', () => {
  it('accepts an HMAC-SHA256 hex digest of the raw body', async () => {
    const body = JSON.stringify({ hello: 'world' })
    const signature = createHmac('sha256', SECRET).update(body).digest('hex')
    expect(await isValidCalcomSignature(body, signature, SECRET)).toBe(true)
  })

  it('rejects a wrong signature or a tampered body', async () => {
    const body = JSON.stringify({ hello: 'world' })
    const signature = createHmac('sha256', SECRET).update(body).digest('hex')
    expect(await isValidCalcomSignature(`${body} `, signature, SECRET)).toBe(false)
    expect(await isValidCalcomSignature(body, 'deadbeef', SECRET)).toBe(false)
    expect(await isValidCalcomSignature(body, undefined, SECRET)).toBe(false)
  })

  it('rejects when no secret is configured', async () => {
    const body = '{}'
    expect(await isValidCalcomSignature(body, 'whatever', '')).toBe(false)
  })
})

describe('syncCalcomBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips unknown booker emails without writing', async () => {
    const { supabase, bookings } = makeSupabase({ profile: { data: null, error: null } })

    const result = await syncCalcomBooking(supabase as never, event('BOOKING_CREATED', {}))

    expect(result).toEqual({ synced: false, reason: 'user_not_found' })
    expect(bookings.upsert).not.toHaveBeenCalled()
  })

  it('falls back to metadata.userId when booker email does not match any profile', async () => {
    const { supabase, profiles, bookings } = makeSupabase()
    profiles.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: USER_ID }, error: null })

    const result = await syncCalcomBooking(
      supabase as never,
      event('BOOKING_CREATED', {
        metadata: { userId: '23465421-b89d-487d-b549-3c78abdfadcb' },
      }),
    )

    expect(result).toEqual({ synced: true })
    expect(profiles.eq).toHaveBeenNthCalledWith(1, 'email', 'student@example.com')
    expect(profiles.eq).toHaveBeenNthCalledWith(2, 'id', '23465421-b89d-487d-b549-3c78abdfadcb')
    expect(bookings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER_ID }),
      { onConflict: 'calcom_booking_uid' },
    )
  })

  it('lowercases the booker email when looking up the profile', async () => {
    const { supabase, profiles } = makeSupabase()

    await syncCalcomBooking(supabase as never, event('BOOKING_CREATED', {}))

    expect(profiles.eq).toHaveBeenCalledWith('email', 'student@example.com')
  })

  it('upserts a created booking with the provider meet link', async () => {
    const { supabase, bookings } = makeSupabase()

    await syncCalcomBooking(
      supabase as never,
      event('BOOKING_CREATED', {
        status: 'ACCEPTED',
        videoCallData: { url: 'https://meet.google.com/abc-defg-hij' },
      }),
    )

    expect(bookings.upsert).toHaveBeenCalledWith(
      {
        calcom_booking_uid: 'uid-new',
        user_id: USER_ID,
        start_time: '2026-10-20T10:00:00Z',
        status: 'ACCEPTED',
        meet_url: 'https://meet.google.com/abc-defg-hij',
      },
      { onConflict: 'calcom_booking_uid' },
    )
  })

  it('omits meet_url when the payload carries no link', async () => {
    const { supabase, bookings } = makeSupabase()

    await syncCalcomBooking(supabase as never, event('BOOKING_CREATED', {}))

    const [row] = bookings.upsert.mock.calls[0]
    expect(row).not.toHaveProperty('meet_url')
    expect(row.status).toBe('ACCEPTED')
  })

  it('updates the existing row in place on reschedule', async () => {
    const { supabase, bookings } = makeSupabase()

    await syncCalcomBooking(
      supabase as never,
      event('BOOKING_RESCHEDULED', {
        uid: 'uid-new',
        rescheduleUid: 'uid-old',
        startTime: '2026-11-01T09:00:00Z',
        videoCallData: { url: 'https://meet.google.com/new-link' },
      }),
    )

    expect(bookings.update).toHaveBeenCalledWith({
      calcom_booking_uid: 'uid-new',
      user_id: USER_ID,
      start_time: '2026-11-01T09:00:00Z',
      status: 'ACCEPTED',
      meet_url: 'https://meet.google.com/new-link',
    })
    expect(bookings.eq).toHaveBeenCalledWith('calcom_booking_uid', 'uid-old')
    expect(bookings.eq).toHaveBeenCalledWith('user_id', USER_ID)
    // Fallback upsert still runs (no-op when the update matched).
    expect(bookings.upsert).toHaveBeenCalled()
  })

  it('upserts a cancelled booking as CANCELLED', async () => {
    const { supabase, bookings } = makeSupabase()

    await syncCalcomBooking(supabase as never, event('BOOKING_CANCELLED', { status: 'CANCELLED' }))

    const [row] = bookings.upsert.mock.calls[0]
    expect(row).toMatchObject({ calcom_booking_uid: 'uid-new', status: 'CANCELLED' })
  })
})

describe('listUserBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scopes by user and maps rows to the API shape', async () => {
    const { supabase, bookings } = makeSupabase()
    bookings.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: [
          {
            calcom_booking_uid: 'uid-1',
            start_time: '2026-10-20T10:00:00Z',
            status: 'ACCEPTED',
            meet_url: 'https://meet.google.com/abc',
          },
          {
            calcom_booking_uid: 'uid-2',
            start_time: '2026-10-12T10:00:00Z',
            status: 'CANCELLED',
            meet_url: null,
          },
        ],
        error: null,
      }).then(resolve)

    const result = await listUserBookings(supabase as never, USER_ID)

    expect(bookings.eq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(bookings.order).toHaveBeenCalledWith('start_time', { ascending: false })
    expect(result).toEqual([
      {
        uid: 'uid-1',
        startTime: '2026-10-20T10:00:00Z',
        status: 'ACCEPTED',
        meetUrl: 'https://meet.google.com/abc',
      },
      { uid: 'uid-2', startTime: '2026-10-12T10:00:00Z', status: 'CANCELLED', meetUrl: null },
    ])
  })
})
