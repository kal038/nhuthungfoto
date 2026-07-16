import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { createServiceClient } from '@/lib/supabase'
import { getPublicUrl } from '@/services/r2'
import { AppError } from '@/lib/errors'

const galleryRouter = new Hono<{
  Bindings: Env
  Variables: { user: AuthVars }
}>()

// GET /v1/gallery/:username — combined profile + submissions in one round trip
galleryRouter.get('/:username', async (c) => {
  const username = c.req.param('username')
  const spb = createServiceClient(c.env)

  // 1. Look up profile (fast index lookup on username)
  const { data: profile, error: profileError } = await spb
    .from('profiles')
    .select('id, username, avatar_url, skill_level')
    .eq('username', username.toLowerCase())
    .single()

  if (profileError || !profile) {
    throw new AppError('User not found', 404)
  }

  // 2. Fetch submissions only if user exists
  const { data, error } = await spb
    .from('submissions')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch submissions:', error)
    throw new AppError('Failed to fetch submissions', 500)
  }

  const submissions = (data || []).map((row) => ({
    id: row.id,
    moduleId: row.module_id,
    status: row.status,
    reviewType: row.review_type,
    createdAt: row.created_at,
    originalPhotoUrl: row.original_photo_key
      ? getPublicUrl(c.env.R2_UPLOADS_RAW_PUBLIC_URL, row.original_photo_key)
      : null,
    processedPhotoUrl: row.processed_photo_key
      ? getPublicUrl(c.env.R2_PORTFOLIO_PUBLIC_URL, row.processed_photo_key)
      : null,
  }))

  return c.json({ profile, submissions }, 200)
})

export { galleryRouter }
