import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { createServiceClient } from '@/lib/supabase'
import { isValidUsername } from '@/lib/username'
import { AppError, BadRequestError } from '@/lib/errors'

const authRouter = new Hono<{ Bindings: Env }>()

// POST /v1/auth/check-username
// Public endpoint to check username availability before signup
authRouter.post('/check-username', async (c) => {
  const body = await c.req.json().catch(() => {
    throw new BadRequestError('Request body must be valid JSON')
  })

  const { username } = body

  if (typeof username !== 'string') {
    throw new BadRequestError('username must be a string')
  }

  if (!isValidUsername(username)) {
    return c.json(
      { available: false, reason: 'invalid' },
      200,
    )
  }

  const supabase = createServiceClient(c.env)
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username.toLowerCase())
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is what we want
    console.error('Error checking username:', error)
    throw new AppError('Failed to check username', 500)
  }

  if (data) {
    return c.json({ available: false, reason: 'taken' }, 200)
  }

  return c.json({ available: true }, 200)
})

export { authRouter }
