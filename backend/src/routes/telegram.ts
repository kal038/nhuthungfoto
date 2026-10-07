import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { createServiceClient } from '@/lib/supabase'
import { approveOrder, rejectOrder } from '@/services/payments'
import { answerCallbackQuery, editReviewMessage, escapeMarkdownV2 } from '@/services/telegram'
import { telegramCallbackUpdateSchema, parseCallbackData } from '@/schema/telegram'
import { AppError } from '@/lib/errors'

export type TelegramWebhookAction = 'approve' | 'reject'

export interface TelegramActionPayload {
  readonly action: TelegramWebhookAction
  readonly orderId: string
}

export const telegramRouter = new Hono<{ Bindings: Env }>()

export function isCorrectWebhookSecret(
  providedSecret: string | undefined,
  expectedSecret: string,
): boolean {
  if (!providedSecret || !expectedSecret) return false
  return providedSecret === expectedSecret
}

export function isCorrectChat(
  chatId: number | string | undefined,
  expectedChatId: string,
): boolean {
  if (chatId === undefined || !expectedChatId) return false
  return String(chatId) === String(expectedChatId)
}

function buildResolvedText(
  action: TelegramWebhookAction,
  orderCode: string,
  amountVnd: number,
  creditAmount: number,
): string {
  const verb = action === 'approve' ? 'ĐÃ DUYỆT' : 'ĐÃ TỪ CHỐI'
  const formattedAmount = escapeMarkdownV2(new Intl.NumberFormat('vi-VN').format(amountVnd))

  return [
    `*${verb}*`,
    '',
    `Mã đơn: \`${orderCode}\``,
    `Số tiền: ${formattedAmount} VND`,
    `Credits: ${creditAmount}`,
  ].join('\n')
}

/**
 * POST /v1/telegram/webhook — receives updates from Telegram Bot API.
 */
telegramRouter.post('/webhook', async (c) => {
  const secretHeader = c.req.header('X-Telegram-Bot-Api-Secret-Token')
  if (!isCorrectWebhookSecret(secretHeader, c.env.TELEGRAM_WEBHOOK_SECRET)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const body = await c.req.json().catch(() => null)
  const parsed = telegramCallbackUpdateSchema.safeParse(body)

  // Non-callback updates (e.g. text messages) are acknowledged without processing.
  if (!parsed.success) {
    return c.json({ ok: true }, 200)
  }

  const { callback_query } = parsed.data
  const chatId = callback_query.message.chat.id
  const messageId = callback_query.message.message_id
  const callbackQueryId = callback_query.id

  // Reject updates from unknown chats with no side effects.
  if (!isCorrectChat(chatId, c.env.TELEGRAM_CHAT_ID)) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const { action, orderId } = parseCallbackData(callback_query.data)
  const supabase = createServiceClient(c.env)

  const metadata = {
    method: 'telegram',
    chat_id: chatId,
    resolved_at: new Date().toISOString(),
  }

  try {
    if (action === 'approve') {
      const updatedOrder = await approveOrder(supabase, orderId, metadata)

      // Acknowledge before editing, so the spinner resolves regardless.
      await answerCallbackQuery(
        c.env,
        callbackQueryId,
        `Đã duyệt — ${updatedOrder.credit_amount} credits cấp cho user`,
      )

      // Edit Telegram card to reflect resolution and remove buttons.
      await editReviewMessage(
        c.env,
        chatId,
        messageId,
        buildResolvedText(
          'approve',
          updatedOrder.order_code,
          updatedOrder.amount_vnd,
          updatedOrder.credit_amount,
        ),
      )
    } else {
      const updatedOrder = await rejectOrder(supabase, orderId, metadata)

      // Reject is a no-op for terminal orders; don't relabel them as rejected.
      if (updatedOrder.status !== 'CANCELLED') {
        await answerCallbackQuery(
          c.env,
          callbackQueryId,
          `Đơn hàng đã được xử lý (${updatedOrder.status})`,
          true,
        )
        return c.json({ ok: true }, 200)
      }

      await answerCallbackQuery(c.env, callbackQueryId, 'Đã từ chối đơn hàng')

      await editReviewMessage(
        c.env,
        chatId,
        messageId,
        buildResolvedText(
          'reject',
          updatedOrder.order_code,
          updatedOrder.amount_vnd,
          updatedOrder.credit_amount,
        ),
      )
    }
  } catch (err) {
    if (err instanceof AppError) {
      if (err.status === 404) {
        await answerCallbackQuery(c.env, callbackQueryId, 'Đơn hàng không tìm thấy', true)
        return c.json({ ok: true }, 200)
      }
      if (err.status === 409) {
        await answerCallbackQuery(c.env, callbackQueryId, err.message, true)
        return c.json({ ok: true }, 200)
      }
    }
    throw err
  }

  return c.json({ ok: true }, 200)
})
