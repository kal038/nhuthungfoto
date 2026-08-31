import { beforeEach, describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import type { AuthVars } from '@/middleware/auth'
import { paymentsRouter } from '@/routes/payments'
import type { Env } from '@/types/env'

describe('Payment Routes', () => {
  let app: Hono<{ Bindings: Env; Variables: { user: AuthVars } }>

  beforeEach(() => {
    app = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()
    app.use('*', async (c, next) => {
      c.set('user', { id: 'user-123', role: 'authenticated' })
      await next()
    })
    app.route('/v1/payments', paymentsRouter)
  })

  it('returns enabled package fields without internal flags', async () => {
    const response = await app.request('/v1/payments/packages')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      packages: [
        {
          id: 'trial',
          label: 'Trải nghiệm',
          credits: 3,
          amountVnd: 99_000,
          isPopular: false,
        },
        {
          id: 'practice',
          label: 'Luyện tập',
          credits: 12,
          amountVnd: 349_000,
          isPopular: true,
        },
        {
          id: 'progress',
          label: 'Tiến bộ',
          credits: 30,
          amountVnd: 749_000,
          isPopular: false,
        },
      ],
    })
  })
})
