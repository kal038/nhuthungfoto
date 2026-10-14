import { z } from 'zod/v4'

// Cal.com webhook payloads (2021-10-20). Only the fields the backend needs are
// modelled; unknown fields are stripped. Docs:
// https://cal.com/docs/developing/guides/automation/webhooks

const attendeeSchema = z.object({
  email: z.email(),
  name: z.string().optional(),
})

const bookingPayloadBaseSchema = z.object({
  uid: z.string().min(1),
  startTime: z.string().min(1),
  attendees: z.array(attendeeSchema).min(1),
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

export function getBookerEmail(payload: CalcomBookingPayload): string {
  return payload.attendees[0].email
}
