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
    `Số tiền: *${formatVnd(params.amountVnd)} VND*`,
    `Credits: *${params.creditAmount}*`,
    `User: \`${params.userId}\``,
    `Xác nhận lúc: ${params.confirmedAt}`,
    '',
    '*Kiểm tra app ngân hàng trước khi duyệt\\!*',
  ].join('\n')

  // Callback data must stay under 64 bytes (Telegram limit).
  // Format: "action:orderId" — orderId is a UUID (36 chars) + prefix ≤ 8 chars.
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
 * Acknowledges Telegram callback query to dismiss client spinner and display toast.
 */
export async function answerCallbackQuery(
  env: Env,
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<void> {
  await callTelegramApi(env.TELEGRAM_BOT_TOKEN, 'answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  })
}

/**
 * Edits Telegram message text to reflect resolved state and remove inline action buttons.
 */
export async function editReviewMessage(
  env: Env,
  chatId: number | string,
  messageId: number,
  text: string,
): Promise<void> {
  await callTelegramApi(env.TELEGRAM_BOT_TOKEN, 'editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'MarkdownV2',
    reply_markup: { inline_keyboard: [] },
  })
}
