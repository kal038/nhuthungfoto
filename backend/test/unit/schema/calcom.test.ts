import { describe, it, expect } from 'vitest'
import {
  calcomWebhookSchema,
  getBookerEmail,
  getMeetUrl,
  getMetadataUserId,
  isHandledCalcomTrigger,
} from '@/schema/calcom'

const createdPayload = {
  uid: 'booking-uid-1',
  startTime: '2026-10-20T10:00:00Z',
  attendees: [{ email: 'student@example.com', name: 'Student' }],
}

describe('calcomWebhookSchema', () => {
  it('accepts a minimal BOOKING_CREATED event', () => {
    const result = calcomWebhookSchema.safeParse({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-10-14T00:00:00.000Z',
      payload: createdPayload,
    })
    expect(result.success).toBe(true)
  })

  it('strips unknown fields instead of failing', () => {
    const result = calcomWebhookSchema.safeParse({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-10-14T00:00:00.000Z',
      payload: { ...createdPayload, eventTypeId: 123, organizer: { id: 1 } },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.payload).not.toHaveProperty('eventTypeId')
    }
  })

  it('rejects an unknown trigger event', () => {
    const result = calcomWebhookSchema.safeParse({
      triggerEvent: 'MEETING_ENDED',
      createdAt: '2026-10-14T00:00:00.000Z',
      payload: createdPayload,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a payload with no attendees', () => {
    const result = calcomWebhookSchema.safeParse({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-10-14T00:00:00.000Z',
      payload: { uid: 'x', startTime: '2026-10-20T10:00:00Z', attendees: [] },
    })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed attendee email', () => {
    const result = calcomWebhookSchema.safeParse({
      triggerEvent: 'BOOKING_CREATED',
      createdAt: '2026-10-14T00:00:00.000Z',
      payload: { ...createdPayload, attendees: [{ email: 'not-an-email' }] },
    })
    expect(result.success).toBe(false)
  })

  it('accepts a BOOKING_RESCHEDULED event carrying rescheduleUid', () => {
    const result = calcomWebhookSchema.safeParse({
      triggerEvent: 'BOOKING_RESCHEDULED',
      createdAt: '2026-10-14T00:00:00.000Z',
      payload: {
        ...createdPayload,
        uid: 'booking-uid-2',
        rescheduleUid: 'booking-uid-1',
        rescheduleStartTime: '2026-10-20T10:00:00Z',
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts a BOOKING_CANCELLED event', () => {
    const result = calcomWebhookSchema.safeParse({
      triggerEvent: 'BOOKING_CANCELLED',
      createdAt: '2026-10-14T00:00:00.000Z',
      payload: { ...createdPayload, status: 'CANCELLED', cancellationReason: 'busy' },
    })
    expect(result.success).toBe(true)
  })
})

describe('isHandledCalcomTrigger', () => {
  it('accepts the three mirrored triggers', () => {
    expect(isHandledCalcomTrigger('BOOKING_CREATED')).toBe(true)
    expect(isHandledCalcomTrigger('BOOKING_RESCHEDULED')).toBe(true)
    expect(isHandledCalcomTrigger('BOOKING_CANCELLED')).toBe(true)
  })

  it('rejects unhandled and non-string values', () => {
    expect(isHandledCalcomTrigger('MEETING_STARTED')).toBe(false)
    expect(isHandledCalcomTrigger(undefined)).toBe(false)
    expect(isHandledCalcomTrigger(42)).toBe(false)
  })
})

describe('getBookerEmail', () => {
  it('returns the first attendee email', () => {
    expect(getBookerEmail(createdPayload)).toBe('student@example.com')
  })
})

describe('getMeetUrl', () => {
  it('prefers the provider videoCallData url', () => {
    expect(
      getMeetUrl({
        ...createdPayload,
        videoCallData: { url: 'https://meet.google.com/abc-defg-hij' },
        metadata: { videoCallUrl: 'https://cal.com/video/1' },
      }),
    ).toBe('https://meet.google.com/abc-defg-hij')
  })

  it('falls back to metadata.videoCallUrl', () => {
    expect(getMeetUrl({ ...createdPayload, metadata: { videoCallUrl: 'https://cal.com/video/1' } })).toBe(
      'https://cal.com/video/1',
    )
  })

  it('returns null when no link is present', () => {
    expect(getMeetUrl(createdPayload)).toBeNull()
  })
})

describe('getMetadataUserId', () => {
  it('returns metadata.userId when valid UUID is present', () => {
    expect(
      getMetadataUserId({
        ...createdPayload,
        metadata: { userId: '23465421-b89d-487d-b549-3c78abdfadcb' },
      }),
    ).toBe('23465421-b89d-487d-b549-3c78abdfadcb')
  })

  it('returns null when metadata.userId is absent', () => {
    expect(getMetadataUserId(createdPayload)).toBeNull()
  })
})
