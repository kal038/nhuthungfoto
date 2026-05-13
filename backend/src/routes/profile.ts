import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase'
import { updateProfileSchema } from '@/schema/profile'
import { AppError, BadRequestError } from '@/lib/errors'

interface Payload {
  full_name?: string
  phone?: string
  avatar_url?: string
  updated_at: string
}

const profileRouter = new Hono<{
  Bindings: Env
  Variables: { user: AuthVars }
}>()

// PATCH /v1/profile — update current user's profile
profileRouter.patch('/', async (c) => {
  const userId = c.get('user').id
  const body = await c.req.json().catch(() => {
    throw new BadRequestError('Request body must be valid JSON')
  })

  // unmarshall body safely
  const result = updateProfileSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: result.error.issues }, 400)
  }

  const { fullName, phone, avatarUrl } = result.data
  const spb = createServiceClient(c.env)

  const payload: Payload = {
    updated_at: new Date().toISOString(),
  }

  if (fullName !== undefined) {
    payload.full_name = fullName
  }

  if (phone !== undefined) {
    payload.phone = phone
  }

  if (avatarUrl !== undefined) {
    payload.avatar_url = avatarUrl
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

export { profileRouter }
