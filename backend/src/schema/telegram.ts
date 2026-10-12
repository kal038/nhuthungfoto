import { z } from 'zod/v4'

/** Inline keyboard callback_data format: "action:orderId". */
export const callbackDataSchema = z
  .string()
  .regex(
    /^(approve|reject|confirm_approve|confirm_reject|back):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    'Invalid callback data format',
  )

/** Parses "action:uuid" into typed action + orderId. */
export type TelegramCallbackAction =
  | 'approve'
  | 'reject'
  | 'confirm_approve'
  | 'confirm_reject'
  | 'back'

export function parseCallbackData(data: string): {
  action: TelegramCallbackAction
  orderId: string
} {
  const [action, orderId] = data.split(':') as [TelegramCallbackAction, string]
  return { action, orderId }
}

/** Minimal shape of a Telegram Update containing a callback_query. */
export const telegramCallbackUpdateSchema = z.object({
  callback_query: z.object({
    id: z.string(),
    from: z.object({ id: z.number() }),
    message: z.object({
      message_id: z.number(),
      chat: z.object({ id: z.number() }),
    }),
    data: callbackDataSchema,
  }),
})

export type TelegramCallbackUpdate = z.infer<typeof telegramCallbackUpdateSchema>
