import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { presignRequestSchema, type PresignedUrlResult } from '@/schema/upload'
import { generatePresignedUploadUrl } from '@/services/r2'
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
      original_photo_url: objectKey,
    })
    .select()
    .single()

  if (error) {
    throw new AppError('Failed to create db record', 500)
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
    { ...presignedUrlResult, submissionId: data.id, objectKey: data.original_photo_url },
    200,
  )
})

export { submissionsRouter }
