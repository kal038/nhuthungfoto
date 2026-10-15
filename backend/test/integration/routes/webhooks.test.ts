import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { webhooksRouter } from '@/routes/webhooks'
import type { Env } from '@/types/env'
import { AppError } from '@/lib/errors'
import { syncCalcomBooking } from '@/services/bookings'

vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(() => ({})),
}))

vi.mock('@/services/bookings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/bookings')>()
  return { ...actual, syncCalcomBooking: vi.fn() }
})

const SECRET = 'calcom-webhook-secret'

const createdEvent = {
  triggerEvent: 'BOOKING_CREATED',
  createdAt: '2026-10-14T00:00:00.000Z',
  payload: {
    uid: 'booking-uid-1',
    startTime: '2026-10-20T10:00:00Z',
    attendees: [{ email: 'student@example.com' }],
  },
}

function sign(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('hex')
}

describe('Cal.com Webhook Route', () => {
  const fakeEnv = { CALCOM_WEBHOOK_SECRET: SECRET } as unknown as Env

  const app = new Hono<{ Bindings: Env }>()
  app.use('*', (c, next) => {
    c.env = fakeEnv
    return next()
  })
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: err.message }, err.status as ContentfulStatusCode)
    }
    return c.json({ error: 'Internal Server Error' }, 500)
  })
  app.route('/v1/webhooks', webhooksRouter)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a missing or invalid signature with 401', async () => {
    const body = JSON.stringify(createdEvent)

    const missing = await app.request('/v1/webhooks/calcom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    expect(missing.status).toBe(401)

    const wrong = await app.request('/v1/webhooks/calcom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cal-Signature-256': 'deadbeef' },
      body,
    })
    expect(wrong.status).toBe(401)
    expect(syncCalcomBooking).not.toHaveBeenCalled()
  })

  it('accepts a valid BOOKING_CREATED event and syncs it', async () => {
    const body = JSON.stringify(createdEvent)

    const response = await app.request('/v1/webhooks/calcom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cal-Signature-256': sign(body) },
      body,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(syncCalcomBooking).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ triggerEvent: 'BOOKING_CREATED' }),
    )
  })

  it('acknowledges and ignores an unsubscribed trigger', async () => {
    const body = JSON.stringify({ triggerEvent: 'MEETING_ENDED', uid: 'x' })

    const response = await app.request('/v1/webhooks/calcom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cal-Signature-256': sign(body) },
      body,
    })

    expect(response.status).toBe(200)
    expect(syncCalcomBooking).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON with 400', async () => {
    const body = 'not-json'

    const response = await app.request('/v1/webhooks/calcom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cal-Signature-256': sign(body) },
      body,
    })

    expect(response.status).toBe(400)
    expect(syncCalcomBooking).not.toHaveBeenCalled()
  })

  it('rejects a handled trigger with a malformed payload', async () => {
    const body = JSON.stringify({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-10-14T00:00:00.000Z',
      payload: { uid: 'x', startTime: '2026-10-20T10:00:00Z', attendees: [] },
    })

    const response = await app.request('/v1/webhooks/calcom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cal-Signature-256': sign(body) },
      body,
    })

    expect(response.status).toBe(400)
    expect(syncCalcomBooking).not.toHaveBeenCalled()
  })
})
