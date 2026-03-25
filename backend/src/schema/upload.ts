import { z } from 'zod/v4'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20MB

export type PresignedUrlResult = {
  uploadUrl: string
  objectKey: string
  expiresIn: number
}

export const presignRequestSchema = z.object({
  fileName: z.string().min(1, 'file name must not be empty'),
  contentType: z.enum(ALLOWED_MIME_TYPES),
  fileSizeBytes: z.number().int().min(1).max(MAX_FILE_SIZE_BYTES),
})

export type PresignRequest = z.infer<typeof presignRequestSchema>
