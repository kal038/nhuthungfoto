import { Hono } from 'hono'
import type { Env } from '../types/env'
import type { AuthVars } from '../middleware/auth'
import { presignRequestSchema, type PresignedUrlResult } from '../schema/upload'
import { generatePresignedUploadUrl } from '../services/r2'

const uploadsRouter = new Hono<{ Bindings: Env; Variables: { user: AuthVars } }>()

uploadsRouter.post('/presign', async (c) => {
  try {
    const body = await c.req.json()
    const result = presignRequestSchema.safeParse(body)
    if (!result.success) {
      return c.json({ error: result.error.issues }, 400)
    }
    const { fileName, contentType, fileSizeBytes } = result.data //get fileName and contentType only

    const userId = c.get('user').id

    const objectKey = `${userId}/${crypto.randomUUID()}/${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}` //placeholder for userID

    const presignedUrlResult: PresignedUrlResult = await generatePresignedUploadUrl(
      c.env,
      objectKey,
      contentType,
      fileSizeBytes,
    )

    return c.json(presignedUrlResult, 200)
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return c.json({ error: 'Failed to generate presigned URL' }, 500)
  }
})

export { uploadsRouter }
