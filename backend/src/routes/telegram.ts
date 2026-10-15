import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { createServiceClient } from '@/lib/supabase'
import { approveOrder, rejectOrder } from '@/services/payments'
import {
  answerCallbackQuery,
  editReviewKeyboard,
  editReviewMessage,
  escapeMarkdownV2,
} from '@/services/telegram'
import { telegramCallbackUpdateSchema, parseCallbackData } from '@/schema/telegram'
import { AppError } from '@/lib/errors'
import { safeSecretCompare } from '@/lib/utils'

export type TelegramWebhookAction = 'approve' | 'reject'

export interface TelegramActionPayload {
  readonly action: TelegramWebhookAction
  readonly orderId: string
}

export const telegramRouter = new Hono<{ Bindings: Env }>()

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

function buildAlreadyResolvedText(
  status: string,
  orderCode: string,
  amountVnd: number,
  creditAmount: number,
): string {
  const statusLabel =
    {
      SUCCESS: 'ĐÃ DUYỆT',
      CANCELLED: 'ĐÃ HỦY',
      EXPIRED: 'ĐÃ HẾT HẠN',
    }[status] ?? 'ĐÃ ĐƯỢC XỬ LÝ'
  const formattedAmount = escapeMarkdownV2(new Intl.NumberFormat('vi-VN').format(amountVnd))

  return [
    `*${statusLabel}*`,
    '',
    `Mã đơn: \`${orderCode}\``,
    `Số tiền: ${formattedAmount} VND`,
    `Credits: ${creditAmount}`,
  ].join('\n')
}

function buildActionErrorText(message: string): string {
  return ['*KHÔNG THỂ XỬ LÝ ĐƠN HÀNG*', '', escapeMarkdownV2(message)].join('\n')
}

function buildReviewKeyboard(
  orderId: string,
  stage: 'actions' | 'approve' | 'reject' | 'closed',
): Array<Array<{ text: string; callback_data: string }>> {
  if (stage === 'closed') return []
  if (stage === 'approve') {
    return [
      [
        { text: '✅ Xác nhận duyệt', callback_data: `confirm_approve:${orderId}` },
        { text: '↩ Quay lại', callback_data: `back:${orderId}` },
      ],
    ]
  }
  if (stage === 'reject') {
    return [
      [
        { text: '⚠️ Xác nhận từ chối', callback_data: `confirm_reject:${orderId}` },
        { text: '↩ Quay lại', callback_data: `back:${orderId}` },
      ],
    ]
  }
  return [
    [
      { text: '✅ Duyệt', callback_data: `approve:${orderId}` },
      { text: '❌ Từ chối', callback_data: `reject:${orderId}` },
    ],
  ]
}

/**
 * POST /v1/webhooks/telegram — receives updates from Telegram Bot API.
 */
telegramRouter.post('/', async (c) => {
  const secretHeader = c.req.header('X-Telegram-Bot-Api-Secret-Token')
  if (!(await safeSecretCompare(secretHeader, c.env.TELEGRAM_WEBHOOK_SECRET))) {
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

  if (action === 'approve' || action === 'reject') {
    const stage = action
    await answerCallbackQuery(c.env, callbackQueryId)
    await editReviewKeyboard(c.env, chatId, messageId, buildReviewKeyboard(orderId, stage))
    return c.json({ ok: true }, 200)
  }

  if (action === 'back') {
    await answerCallbackQuery(c.env, callbackQueryId)
    await editReviewKeyboard(c.env, chatId, messageId, buildReviewKeyboard(orderId, 'actions'))
    return c.json({ ok: true }, 200)
  }

  const metadata = {
    method: 'telegram',
    chat_id: chatId,
    resolved_at: new Date().toISOString(),
  }

  await answerCallbackQuery(c.env, callbackQueryId)

  try {
    if (action === 'confirm_approve') {
      const updatedOrder = await approveOrder(supabase, orderId, metadata)

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
        await editReviewMessage(
          c.env,
          chatId,
          messageId,
          buildAlreadyResolvedText(
            updatedOrder.status,
            updatedOrder.order_code,
            updatedOrder.amount_vnd,
            updatedOrder.credit_amount,
          ),
        )
        return c.json({ ok: true }, 200)
      }

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
        await editReviewMessage(
          c.env,
          chatId,
          messageId,
          buildActionErrorText('Không tìm thấy đơn hàng.'),
        )
        return c.json({ ok: true }, 200)
      }
      if (err.status === 409) {
        await editReviewMessage(
          c.env,
          chatId,
          messageId,
          buildActionErrorText('Đơn hàng đã được xử lý hoặc không còn chờ xác minh.'),
        )
        return c.json({ ok: true }, 200)
      }
    }
    throw err
  }

  return c.json({ ok: true }, 200)
})
