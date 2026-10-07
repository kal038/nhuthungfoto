import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  sendPaymentReviewNotification,
  answerCallbackQuery,
  editReviewMessage,
} from '@/services/telegram'
import type { Env } from '@/types/env'

describe('Telegram service', () => {
  const fakeEnv = {
    TELEGRAM_BOT_TOKEN: 'fake-token-123',
    TELEGRAM_CHAT_ID: '123456789',
    TELEGRAM_WEBHOOK_SECRET: 'test-secret',
  } as unknown as Env

  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('sendPaymentReviewNotification', () => {
    it('sends notification card with inline approve and reject buttons', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            message_id: 42,
            chat: { id: 123456789 },
          },
        }),
      } as Response)

      const result = await sendPaymentReviewNotification(fakeEnv, {
        orderId: '0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        orderCode: 'ABC2345',
        amountVnd: 349_000,
        creditAmount: 12,
        userId: 'user-123',
        confirmedAt: '2026-10-06T10:00:00Z',
      })

      expect(result).toEqual({ messageId: 42, chatId: 123456789 })
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botfake-token-123/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('ABC2345'),
        }),
      )

      const requestBody = JSON.parse(
        vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
      )
      expect(requestBody.chat_id).toBe('123456789')
      expect(requestBody.reply_markup.inline_keyboard[0]).toEqual([
        { text: '✅ Duyệt', callback_data: 'approve:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11' },
        { text: '❌ Từ chối', callback_data: 'reject:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11' },
      ])
    })

    it('escapes MarkdownV2-reserved characters in dynamic values', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: { message_id: 42, chat: { id: 123456789 } },
        }),
      } as Response)

      await sendPaymentReviewNotification(fakeEnv, {
        orderId: '0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        orderCode: 'ABC2345',
        amountVnd: 349_000,
        creditAmount: 12,
        userId: 'user-123',
        confirmedAt: '2026-10-06T10:00:00Z',
      })

      const requestBody = JSON.parse(
        vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string,
      )
      expect(requestBody.text).toContain('349\\.000')
      expect(requestBody.text).toContain('2026\\-10\\-06T10:00:00Z')
    })

    it('throws AppError 502 when Telegram API returns ok: false', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          description: 'Bad Request: chat not found',
        }),
      } as Response)

      await expect(
        sendPaymentReviewNotification(fakeEnv, {
          orderId: '0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
          orderCode: 'ABC2345',
          amountVnd: 349_000,
          creditAmount: 12,
          userId: 'user-123',
          confirmedAt: '2026-10-06T10:00:00Z',
        }),
      ).rejects.toMatchObject({
        status: 502,
        message: 'Telegram API error: Bad Request: chat not found',
      })
    })
  })

  describe('answerCallbackQuery', () => {
    it('answers callback query with alert flag', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        json: async () => ({ ok: true, result: true }),
      } as Response)

      await answerCallbackQuery(fakeEnv, 'cb-query-123', 'Đã xử lý', true)

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botfake-token-123/answerCallbackQuery',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            callback_query_id: 'cb-query-123',
            text: 'Đã xử lý',
            show_alert: true,
          }),
        }),
      )
    })

    it('treats an already-answered / expired callback as a no-op', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          description: 'Bad Request: query is too old and response timeout expired',
        }),
      } as Response)

      await expect(answerCallbackQuery(fakeEnv, 'cb-query-123')).resolves.toBeUndefined()
    })
  })

  describe('editReviewMessage', () => {
    it('edits message text and clears inline keyboard', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        json: async () => ({ ok: true, result: {} }),
      } as Response)

      await editReviewMessage(fakeEnv, '123456789', 42, '*ĐÃ DUYỆT*')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botfake-token-123/editMessageText',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            chat_id: '123456789',
            message_id: 42,
            text: '*ĐÃ DUYỆT*',
            parse_mode: 'MarkdownV2',
            reply_markup: { inline_keyboard: [] },
          }),
        }),
      )
    })

    it('treats "message is not modified" as success (idempotent re-edit)', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          description: 'Bad Request: message is not modified',
        }),
      } as Response)

      await expect(
        editReviewMessage(fakeEnv, '123456789', 42, '*ĐÃ DUYỆT*'),
      ).resolves.toBeUndefined()
    })
  })
})
