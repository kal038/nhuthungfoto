import { Hono } from 'hono'
import type { Env } from '../types/env'
import type { AuthVars } from '../middleware/auth'
import { presignRequestSchema, type PresignedUrlResult } from '../schema/upload'
import { generatePresignedUploadUrl } from '../services/r2'

const uploadsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

uploadsRouter.post('/', async (c) => {
  const body = await c.req.json()
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
  )

  return c.json(presignedUrlResult, 200)
})

export { uploadsRouter }
