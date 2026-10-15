import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { createServiceClient } from '@/lib/supabase'
import { ZodParseError } from '@/lib/errors'
import { calcomWebhookSchema, isHandledCalcomTrigger } from '@/schema/calcom'
import { isValidCalcomSignature, syncCalcomBooking } from '@/services/bookings'
import { telegramRouter } from './telegram'

/**
 * Public, signature-verified webhook sinks. Mounted before the global auth
 * middleware, so each route authenticates the caller itself.
 */
export const webhooksRouter = new Hono<{ Bindings: Env }>()

// POST /v1/webhooks/telegram — Telegram bot updates (secret-token header).
webhooksRouter.route('/telegram', telegramRouter)

// POST /v1/webhooks/calcom — Cal.com booking event sink.
webhooksRouter.post('/calcom', async (c) => {
  const rawBody = await c.req.text()

  const signatureOk = await isValidCalcomSignature(
    rawBody,
    c.req.header('X-Cal-Signature-256'),
    c.env.CALCOM_WEBHOOK_SECRET,
  )
  if (!signatureOk) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    throw new ZodParseError('Request body must be valid JSON')
  }

  // Triggers we did not subscribe to are acknowledged and ignored.
  if (!isHandledCalcomTrigger((body as { triggerEvent?: unknown })?.triggerEvent)) {
    return c.json({ ok: true }, 200)
  }

  const parsed = calcomWebhookSchema.safeParse(body)
  if (!parsed.success) {
    throw new ZodParseError('Invalid Cal.com webhook payload')
  }

  const supabase = createServiceClient(c.env)
  await syncCalcomBooking(supabase, parsed.data)

  return c.json({ ok: true }, 200)
})
