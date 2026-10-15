import { z } from 'zod/v4'

/**
 * Cal.com webhook payloads (2021-10-20). Only the fields the backend needs are
 * modelled; unknown fields are stripped. Docs:
 * https://cal.com/docs/developing/guides/automation/webhooks
 */

const attendeeSchema = z.object({
  email: z.email(),
  name: z.string().optional(),
})

const bookingPayloadBaseSchema = z.object({
  uid: z.string().min(1),
  startTime: z.string().min(1),
  attendees: z.array(attendeeSchema).min(1),
  // Meet link: provider url first, Cal.com fallback. Lenient so a missing link never fails validation.
  videoCallData: z.object({ url: z.string().optional() }).optional(),
  metadata: z
    .object({
      videoCallUrl: z.string().optional(),
      userId: z.uuid().optional(),
    })
    .optional(),
  status: z.enum(['ACCEPTED', 'PENDING', 'CANCELLED']).optional(),
})

const bookingCreatedPayloadSchema = bookingPayloadBaseSchema.extend({
  status: z.enum(['ACCEPTED', 'PENDING']).optional(),
})

const bookingRescheduledPayloadSchema = bookingPayloadBaseSchema.extend({
  status: z.enum(['ACCEPTED', 'PENDING']).optional(),
  rescheduleUid: z.string().min(1).optional(),
  rescheduleStartTime: z.string().min(1).optional(),
})

const bookingCancelledPayloadSchema = bookingPayloadBaseSchema.extend({
  status: z.literal('CANCELLED').optional(),
  cancellationReason: z.string().optional(),
})

export const calcomWebhookSchema = z.discriminatedUnion('triggerEvent', [
  z.object({
    triggerEvent: z.literal('BOOKING_CREATED'),
    createdAt: z.string(),
    payload: bookingCreatedPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('BOOKING_RESCHEDULED'),
    createdAt: z.string(),
    payload: bookingRescheduledPayloadSchema,
  }),
  z.object({
    triggerEvent: z.literal('BOOKING_CANCELLED'),
    createdAt: z.string(),
    payload: bookingCancelledPayloadSchema,
  }),
])

export type CalcomWebhook = z.infer<typeof calcomWebhookSchema>
export type CalcomBookingPayload = z.infer<typeof bookingPayloadBaseSchema>

/** Trigger events we mirror into `public.bookings`; others are acknowledged and ignored. */
export const CALCOM_HANDLED_TRIGGERS = [
  'BOOKING_CREATED',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
] as const

export type CalcomTrigger = (typeof CALCOM_HANDLED_TRIGGERS)[number]

export function isHandledCalcomTrigger(triggerEvent: unknown): triggerEvent is CalcomTrigger {
  return (
    typeof triggerEvent === 'string' &&
    (CALCOM_HANDLED_TRIGGERS as readonly string[]).includes(triggerEvent)
  )
}

export function getBookerEmail(payload: CalcomBookingPayload): string {
  return payload.attendees[0].email
}

/** Provider meeting link, or Cal.com's fallback, or null when absent. */
export function getMeetUrl(payload: CalcomBookingPayload): string | null {
  return payload.videoCallData?.url || payload.metadata?.videoCallUrl || null
}

/** Student profile UUID echoed back from `?metadata[userId]=<uuid>`, or null. */
export function getMetadataUserId(payload: CalcomBookingPayload): string | null {
  return payload.metadata?.userId ?? null
}
