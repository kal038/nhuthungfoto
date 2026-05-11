import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase'
import { updateProfileSchema } from '@/schema/profile'
import { AppError, BadRequestError } from '@/lib/errors'

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

  const result = updateProfileSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: result.error.issues }, 400)
  }

  const { fullName, phone, avatarUrl } = result.data
  const supabase = createServiceClient(c.env)

  const updatePayload: {
    full_name?: string
    phone?: string
    avatar_url?: string | null
    updated_at?: string
  } = {
    updated_at: new Date().toISOString(),
  }

  if (fullName !== undefined) {
    updatePayload.full_name = fullName
  }

  if (phone !== undefined) {
    updatePayload.phone = phone
  }

  if (avatarUrl !== undefined) {
    updatePayload.avatar_url = avatarUrl || null
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
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
