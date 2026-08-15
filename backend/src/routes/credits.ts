import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase'
import { getBalance, getHistory } from '@/services/credit'
import type { CreditHistoryEntry } from '@/services/credit'
import { creditHistoryQuerySchema } from '@/schema/credit'
import { ZodParseError } from '@/lib/errors'

// --- Response types (mirror these on the frontend) ---

/** GET /v1/credits/balance response */
export interface CreditBalanceResponse {
  balance: number
}

/** GET /v1/credits/history response */
export interface CreditHistoryResponse {
  entries: CreditHistoryEntry[]
  total: number
  limit: number
  offset: number
}

const creditsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

// GET /v1/credits/balance — current user's credit balance
creditsRouter.get('/balance', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const balance = await getBalance(supabase, userId)

  const response: CreditBalanceResponse = { balance }
  return c.json(response, 200)
})

// GET /v1/credits/history — paginated credit transaction log
creditsRouter.get('/history', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const query = creditHistoryQuerySchema.safeParse({
    limit: c.req.query('limit'),
    offset: c.req.query('offset'),
  })

  if (!query.success) {
    throw new ZodParseError()
  }

  const { limit, offset } = query.data
  const { entries, total } = await getHistory(supabase, userId, limit, offset)

  const response: CreditHistoryResponse = { entries, total, limit, offset }
  return c.json(response, 200)
})

export { creditsRouter }
