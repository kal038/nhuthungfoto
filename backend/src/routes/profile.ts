import { Hono } from 'hono'
import type { Env } from '../types/env'
import type { AuthVars } from '../middleware/auth'
import { createServiceClient } from '../lib/supabase'
import { updateProfileSchema } from '../schema/profile'

const profileRouter = new Hono<{
  Bindings: Env
  Variables: { user: AuthVars }
}>()

// PATCH /v1/profile — update current user's profile
profileRouter.patch('/', async (c) => {
  const userId = c.get('user').id
  const body = await c.req.json()

  const result = updateProfileSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: result.error.issues }, 400)
  }

  const { fullName, phone } = result.data
  const supabase = createServiceClient(c.env)

  const updatePayload: {
    full_name?: string
    phone?: string
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

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return c.json({ error: 'Failed to update profile' }, 500)
  }

  return c.json(data, 200)
})

export { profileRouter }
