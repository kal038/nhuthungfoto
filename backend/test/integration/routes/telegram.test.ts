import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import { telegramRouter } from '@/routes/telegram'
import type { Env } from '@/types/env'
import { approveOrder, rejectOrder } from '@/services/payments'
import { answerCallbackQuery, editReviewKeyboard, editReviewMessage } from '@/services/telegram'
import { AppError } from '@/lib/errors'

vi.mock('@/lib/supabase', () => ({
  createServiceClient: vi.fn(() => ({})),
}))

vi.mock('@/services/payments', () => ({
  approveOrder: vi.fn(),
  rejectOrder: vi.fn(),
}))

vi.mock('@/services/telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/telegram')>()
  return {
    ...actual,
    answerCallbackQuery: vi.fn(),
    editReviewKeyboard: vi.fn(),
    editReviewMessage: vi.fn(),
  }
})

describe('Telegram Webhook Route', () => {
  const fakeEnv: Env = {
    TELEGRAM_BOT_TOKEN: 'fake-token',
    TELEGRAM_CHAT_ID: '987654321',
    TELEGRAM_WEBHOOK_SECRET: 'secret-xyz',
  } as unknown as Env

  const app = new Hono<{ Bindings: Env }>()
  app.use('*', (c, next) => {
    c.env = fakeEnv
    return next()
  })
  app.route('/webhook', telegramRouter)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects requests with missing or invalid secret token header with 401', async () => {
    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: { 'X-Telegram-Bot-Api-Secret-Token': 'wrong-secret' },
    })
    expect(res.status).toBe(401)
  })

  it('acknowledges non-callback updates with 200 without processing', async () => {
    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { text: '/start' } }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(approveOrder).not.toHaveBeenCalled()
  })

  it('asks for explicit approval before calling the approval RPC', async () => {
    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query: {
          id: 'cb-confirm-approve',
          from: { id: 987654321 },
          message: { message_id: 20, chat: { id: 987654321 } },
          data: 'approve:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      }),
    })

    expect(res.status).toBe(200)
    expect(approveOrder).not.toHaveBeenCalled()
    expect(rejectOrder).not.toHaveBeenCalled()
    expect(answerCallbackQuery).toHaveBeenCalledWith(fakeEnv, 'cb-confirm-approve')
    expect(editReviewKeyboard).toHaveBeenCalledWith(fakeEnv, 987654321, 20, [
      [
        {
          text: '✅ Xác nhận duyệt',
          callback_data: 'confirm_approve:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
        {
          text: '↩ Quay lại',
          callback_data: 'back:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      ],
    ])
  })

  it('asks for explicit rejection before calling the rejection RPC', async () => {
    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query: {
          id: 'cb-confirm-reject',
          from: { id: 987654321 },
          message: { message_id: 22, chat: { id: 987654321 } },
          data: 'reject:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      }),
    })

    expect(res.status).toBe(200)
    expect(approveOrder).not.toHaveBeenCalled()
    expect(rejectOrder).not.toHaveBeenCalled()
    expect(answerCallbackQuery).toHaveBeenCalledWith(fakeEnv, 'cb-confirm-reject')
    expect(editReviewKeyboard).toHaveBeenCalledWith(fakeEnv, 987654321, 22, [
      [
        {
          text: '⚠️ Xác nhận từ chối',
          callback_data: 'confirm_reject:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
        {
          text: '↩ Quay lại',
          callback_data: 'back:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      ],
    ])
  })

  it('restores the original action buttons when admin goes back', async () => {
    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query: {
          id: 'cb-back',
          from: { id: 987654321 },
          message: { message_id: 21, chat: { id: 987654321 } },
          data: 'back:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      }),
    })

    expect(res.status).toBe(200)
    expect(answerCallbackQuery).toHaveBeenCalledWith(fakeEnv, 'cb-back')
    expect(approveOrder).not.toHaveBeenCalled()
    expect(rejectOrder).not.toHaveBeenCalled()
    expect(editReviewKeyboard).toHaveBeenCalledWith(fakeEnv, 987654321, 21, [
      [
        {
          text: '✅ Duyệt',
          callback_data: 'approve:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
        {
          text: '❌ Từ chối',
          callback_data: 'reject:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      ],
    ])
  })

  it('rejects callback queries from unauthorized chat with 403', async () => {
    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query: {
          id: 'cb-1',
          from: { id: 111 },
          message: {
            message_id: 10,
            // unauthorized chat
            chat: { id: 111111111 },
          },
          data: 'approve:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      }),
    })
    expect(res.status).toBe(403)
  })

  it('handles approve callback: approves order, edits card, and answers query', async () => {
    vi.mocked(approveOrder).mockResolvedValue({
      id: '0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
      status: 'SUCCESS',
      order_code: 'ABC2345',
      amount_vnd: 349_000,
      credit_amount: 12,
      user_id: 'user-1',
    } as never)

    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query: {
          id: 'cb-1',
          from: { id: 987654321 },
          message: {
            message_id: 10,
            chat: { id: 987654321 },
          },
          data: 'confirm_approve:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      }),
    })

    expect(res.status).toBe(200)
    expect(approveOrder).toHaveBeenCalledWith(
      expect.anything(),
      '0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
      expect.objectContaining({ method: 'telegram', chat_id: 987654321 }),
    )
    expect(answerCallbackQuery.mock.invocationCallOrder[0]).toBeLessThan(
      approveOrder.mock.invocationCallOrder[0],
    )
    expect(editReviewMessage).toHaveBeenCalledWith(
      fakeEnv,
      987654321,
      10,
      expect.stringContaining('ĐÃ DUYỆT'),
    )
    // Amount must be MarkdownV2-escaped (dot separator) or Telegram rejects the edit.
    expect(editReviewMessage).toHaveBeenCalledWith(
      fakeEnv,
      987654321,
      10,
      expect.stringContaining('349\\.000'),
    )
    expect(answerCallbackQuery).toHaveBeenCalledWith(fakeEnv, 'cb-1')
  })

  it('handles reject callback: rejects order, edits card, and answers query', async () => {
    vi.mocked(rejectOrder).mockResolvedValue({
      id: '0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
      status: 'CANCELLED',
      order_code: 'ABC2345',
      amount_vnd: 349_000,
      credit_amount: 12,
      user_id: 'user-1',
    } as never)

    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query: {
          id: 'cb-2',
          from: { id: 987654321 },
          message: {
            message_id: 11,
            chat: { id: 987654321 },
          },
          data: 'confirm_reject:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      }),
    })

    expect(res.status).toBe(200)
    expect(rejectOrder).toHaveBeenCalledWith(
      expect.anything(),
      '0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
      expect.objectContaining({ method: 'telegram', chat_id: 987654321 }),
    )
    expect(editReviewMessage).toHaveBeenCalledWith(
      fakeEnv,
      987654321,
      11,
      expect.stringContaining('ĐÃ TỪ CHỐI'),
    )
    expect(answerCallbackQuery).toHaveBeenCalledWith(fakeEnv, 'cb-2')
  })

  it('does not relabel an already-resolved order when rejecting', async () => {
    vi.mocked(rejectOrder).mockResolvedValue({
      id: '0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
      // reject is a no-op here: another admin already approved it.
      status: 'SUCCESS',
      order_code: 'ABC2345',
      amount_vnd: 349_000,
      credit_amount: 12,
      user_id: 'user-1',
    } as never)

    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query: {
          id: 'cb-5',
          from: { id: 987654321 },
          message: {
            message_id: 14,
            chat: { id: 987654321 },
          },
          data: 'confirm_reject:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      }),
    })

    expect(res.status).toBe(200)
    expect(answerCallbackQuery).toHaveBeenCalledWith(fakeEnv, 'cb-5')
    expect(editReviewMessage).toHaveBeenCalledWith(
      fakeEnv,
      987654321,
      14,
      expect.stringContaining('ĐÃ DUYỆT'),
    )
    expect(editReviewMessage).not.toHaveBeenCalledWith(
      fakeEnv,
      987654321,
      14,
      expect.stringContaining('ĐÃ TỪ CHỐI'),
    )
  })

  it('writes a persistent card error when RPC raises 409', async () => {
    vi.mocked(approveOrder).mockRejectedValue(
      new AppError('Order cannot be approved in its current state', 409),
    )

    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query: {
          id: 'cb-3',
          from: { id: 987654321 },
          message: {
            message_id: 12,
            chat: { id: 987654321 },
          },
          data: 'confirm_approve:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      }),
    })

    expect(res.status).toBe(200)
    expect(answerCallbackQuery).toHaveBeenCalledWith(fakeEnv, 'cb-3')
    expect(editReviewMessage).toHaveBeenCalledWith(
      fakeEnv,
      987654321,
      12,
      expect.stringContaining('Đơn hàng đã được xử lý'),
    )
  })

  it('writes a persistent card error when order is not found', async () => {
    vi.mocked(approveOrder).mockRejectedValue(new AppError('Order not found', 404))

    const res = await app.request('/webhook/webhook', {
      method: 'POST',
      headers: {
        'X-Telegram-Bot-Api-Secret-Token': 'secret-xyz',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        callback_query: {
          id: 'cb-4',
          from: { id: 987654321 },
          message: {
            message_id: 13,
            chat: { id: 987654321 },
          },
          data: 'confirm_approve:0b4b2c1e-9f6d-4a3f-8f1e-2c9d7a5b3e11',
        },
      }),
    })

    expect(res.status).toBe(200)
    expect(answerCallbackQuery).toHaveBeenCalledWith(fakeEnv, 'cb-4')
    expect(editReviewMessage).toHaveBeenCalledWith(
      fakeEnv,
      987654321,
      13,
      expect.stringContaining('Không tìm thấy đơn hàng'),
    )
  })
})
