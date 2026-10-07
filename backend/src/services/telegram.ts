import { AppError } from '@/lib/errors'
import type { Env } from '@/types/env'

const TELEGRAM_API = 'https://api.telegram.org'

export interface PaymentReviewNotificationParams {
  readonly orderId: string
  readonly orderCode: string
  readonly amountVnd: number
  readonly creditAmount: number
  readonly userId: string
  readonly confirmedAt: string
}

export interface TelegramMessageResult {
  readonly messageId: number
  readonly chatId: number | string
}

/** Telegram Bot API response envelope. */
interface TelegramResponse<T = unknown> {
  ok: boolean
  description?: string
  result?: T
}

/** Calls a Telegram Bot API method and returns the parsed result. */
async function callTelegramApi<T>(
  botToken: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as TelegramResponse<T>

  if (!json.ok) {
    console.error(`Telegram ${method} failed:`, json.description)
    throw new AppError(`Telegram API error: ${json.description ?? 'unknown'}`, 502)
  }

  return json.result as T
}

/** Formats VND amount with dot-separated thousands. */
function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount)
}

/** Escapes MarkdownV2 reserved characters in dynamic values (Telegram parse_mode). */
export function escapeMarkdownV2(value: string): string {
  return value.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}

/**
 * Sends order review notification card with bank-app warning and inline action buttons to admin chat.
 */
export async function sendPaymentReviewNotification(
  env: Env,
  params: PaymentReviewNotificationParams,
): Promise<TelegramMessageResult> {
  const text = [
    '*Xác nhận chuyển khoản mới*',
    '',
    `Mã đơn: \`${params.orderCode}\``,
    `Số tiền: *${escapeMarkdownV2(formatVnd(params.amountVnd))} VND*`,
    `Credits: *${params.creditAmount}*`,
    `User: \`${params.userId}\``,
    `Xác nhận lúc: ${escapeMarkdownV2(params.confirmedAt)}`,
    '',
    '*Kiểm tra app ngân hàng trước khi duyệt\\!*',
  ].join('\n')

  // Callback data must stay under Telegram's 64-byte limit: "action:orderId".
  const result = await callTelegramApi<{ message_id: number; chat: { id: number } }>(
    env.TELEGRAM_BOT_TOKEN,
    'sendMessage',
    {
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Duyệt', callback_data: `approve:${params.orderId}` },
            { text: '❌ Từ chối', callback_data: `reject:${params.orderId}` },
          ],
        ],
      },
    },
  )

  return { messageId: result.message_id, chatId: result.chat.id }
}

/**
 * Acknowledges the callback query; an expired/already-answered query is a no-op.
 */
export async function answerCallbackQuery(
  env: Env,
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<void> {
  try {
    await callTelegramApi(env.TELEGRAM_BOT_TOKEN, 'answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    })
  } catch (err) {
    const message = err instanceof AppError ? err.message : ''
    if (/query is too old|query ID is invalid/i.test(message)) return
    throw err
  }
}

/**
 * Edits the resolved card and removes the buttons; an identical re-edit is a no-op.
 */
export async function editReviewMessage(
  env: Env,
  chatId: number | string,
  messageId: number,
  text: string,
): Promise<void> {
  try {
    await callTelegramApi(env.TELEGRAM_BOT_TOKEN, 'editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'MarkdownV2',
      reply_markup: { inline_keyboard: [] },
    })
  } catch (err) {
    const message = err instanceof AppError ? err.message : ''
    if (/message is not modified/i.test(message)) return
    throw err
  }
}
