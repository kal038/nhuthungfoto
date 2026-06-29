import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { presignRequestSchema, type PresignedUrlResult } from '@/schema/upload'
import { generatePresignedUploadUrl, getPublicUrl } from '@/services/r2'
import { AppError, BadRequestError, ZodParseError } from '@/lib/errors'
import { createServiceClient } from '@/lib/supabase'

const submissionsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

submissionsRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => {
    throw new BadRequestError('Request body must be valid JSON')
  })

  const result = presignRequestSchema.safeParse(body)
  if (!result.success) {
    throw new ZodParseError()
  }
  const { fileName, contentType, fileSizeBytes } = result.data
  const userId = c.get('user').id //grab userId from context of request
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  const submissionId = crypto.randomUUID()
  const objectKey = `${userId}/${submissionId}/${safeFileName}`

  const supabase = createServiceClient(c.env)
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      id: submissionId,
      user_id: userId,
      original_photo_key: objectKey,
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    throw new AppError(`Failed to create db record: ${error.message}`, 500)
  }

  const presignedUrlResult: PresignedUrlResult = await generatePresignedUploadUrl(
    c.env,
    objectKey,
    contentType,
    fileSizeBytes,
  ).catch((err) => {
    console.error('Presign error:', err)
    throw new AppError('Failed to generate presigned URL', 502)
  })

  return c.json(
    { ...presignedUrlResult, submissionId: data.id, objectKey: data.original_photo_key },
    200,
  )
})

submissionsRouter.get('/me', async (c) => {
  const userId = c.get('user').id
  const supabase = createServiceClient(c.env)

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('user_id', userId)
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

  return c.json({ submissions }, 200)
})

export { submissionsRouter }
