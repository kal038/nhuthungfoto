import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase'
import { getBalance, getHistory } from '@/services/credit'
import { creditHistoryQuerySchema } from '@/schema/credit'
import { ZodParseError } from '@/lib/errors'

const creditsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

// GET /v1/credits/balance — current user's credit balance
creditsRouter.get('/balance', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const balance = await getBalance(supabase, userId)

  return c.json({ balance }, 200)
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

  return c.json({ entries, total, limit, offset }, 200)
})

export { creditsRouter }
