import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase'
import { updateProfileSchema } from '@/schema/profile'
import { AppError, BadRequestError, ZodParseError } from '@/lib/errors'

interface Payload {
  phone?: string | null
  avatar_url?: string | null
  updated_at: string
}

const profileRouter = new Hono<{
  Bindings: Env
  Variables: { user: AuthVars }
}>()

// GET /v1/profile — current user's own profile (determined from auth token)
// Explicit column list prevents future sensitive columns from leaking automatically.
profileRouter.get('/', async (c) => {
  const userId = c.get('user').id
  const spb = createServiceClient(c.env)

  const { data, error } = await spb
    .from('profiles')
    .select(
      'id, username, email, avatar_url, phone, credits_balance, skill_level, phone_verified, email_verified, locale, current_module, updated_at',
    )
    .eq('id', userId)
    .single()

  if (error || !data) {
    throw new AppError('Profile not found', 404)
  }

  return c.json(data, 200)
})

// PATCH /v1/profile — update current user's profile
profileRouter.patch('/', async (c) => {
  const userId = c.get('user').id
  const body = await c.req.json().catch(() => {
    throw new BadRequestError('Request body must be valid JSON')
  })

  // unmarshall body safely
  const result = updateProfileSchema.safeParse(body)
  if (!result.success) {
    throw new ZodParseError()
  }

  const { phone, avatarUrl } = result.data
  const spb = createServiceClient(c.env)

  const payload: Payload = {
    updated_at: new Date().toISOString(),
  }

  if (phone !== undefined) {
    payload.phone = phone === '' ? null : phone
  }

  if (avatarUrl !== undefined) {
    payload.avatar_url = avatarUrl === '' ? null : avatarUrl
  }

  const { data, error } = await spb
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    throw new AppError('Failed to update profile', 502)
  }

  return c.json(data, 200)
})

// GET /v1/profile/:username — get public profile by username
profileRouter.get('/:username', async (c) => {
  const username = c.req.param('username')
  const spb = createServiceClient(c.env)

  const { data, error } = await spb
    .from('profiles')
    .select('id, username, avatar_url, skill_level')
    .eq('username', username.toLowerCase())
    .single()

  if (error || !data) {
    throw new AppError('User not found', 404)
  }

  return c.json(data, 200)
})

export { profileRouter }
