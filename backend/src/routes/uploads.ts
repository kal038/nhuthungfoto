import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { presignRequestSchema, type PresignedUrlResult } from '@/schema/upload'
import { generatePresignedUploadUrl } from '@/services/r2'
import { AppError, BadRequestError } from '@/lib/errors'

const uploadsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

uploadsRouter.post('/', async (c) => {
  const body = await c.req.json().catch(() => {
    throw new BadRequestError('Request body must be valid JSON')
  })

  const result = presignRequestSchema.safeParse(body)
  if (!result.success) {
    return c.json({ error: result.error.issues }, 400)
  }
  const { fileName, contentType, fileSizeBytes } = result.data

  const userId = c.get('user').id

  const objectKey = `${userId}/${crypto.randomUUID()}/${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}`

  const presignedUrlResult: PresignedUrlResult = await generatePresignedUploadUrl(
    c.env,
    objectKey,
    contentType,
    fileSizeBytes,
  ).catch((err) => {
    console.error('Presign error:', err)
    throw new AppError('Failed to generate presigned URL', 502)
  })

  return c.json(presignedUrlResult, 200)
})

export { uploadsRouter }
