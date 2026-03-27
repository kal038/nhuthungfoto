import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from '../../../src/types/env'
import { uploadsRouter } from '../../../src/routes/uploads'
import { AwsClient } from 'aws4fetch'

// Test Hono routing
// Test Zod validation
// Test presigning logic

const mockSign = vi.fn()

// Mock aws4fetch
vi.mock('aws4fetch', () => ({
  AwsClient: vi.fn().mockImplementation(function () {
    return { sign: mockSign }
  }),
}))

// Uploads route suite
describe('Uploads Route', () => {
  let app: Hono<{ Bindings: Env }>

  const mockEnv: Env = {
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
    R2_UPLOADS_RAW_NAME: 'test-uploads-bucket',
    FRONTEND_URL: 'http://localhost:5173',
  } as Env

  const validRequest = {
    fileName: 'photo.jpg',
    contentType: 'image/jpeg',
    fileSizeBytes: 1024 * 1024,
  }

  const invalidRequestTooLarge = {
    fileName: 'photo.jpg',
    contentType: 'image/jpeg',
    fileSizeBytes: 30_000_000,
  }

  const invalidRequestInvalidContentType = {
    fileName: 'photo.jpg',
    contentType: 'image/gif',
    fileSizeBytes: 1024,
  }

  const invalidRequestMissingFileName = {
    contentType: 'image/jpeg',
    fileSizeBytes: 1024,
  }

  const invalidRequestMissingContentType = {
    fileName: 'photo.jpg',
    fileSizeBytes: 1024,
  }

  const invalidRequestEmptyBody = {}

  beforeEach(() => {
    app = new Hono<{ Bindings: Env }>()
    app.use('*', async (c, next) => {
      c.env = mockEnv
      await next()
    })
    app.use('*', (c, next) => {
      const corsMiddleware = cors({
        origin: mockEnv.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
      })
      return corsMiddleware(c, next)
    })
    app.route('/v1/uploads', uploadsRouter)
    vi.clearAllMocks()
  })

  function postPresign(body: unknown, headers?: Record<string, string>) {
    return app.request('/v1/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  }

  // Presign endpoint suite
  describe('POST /v1/uploads/presign', () => {
    it('should return 200 with presigned URL result', async () => {
      const mockSignedUrl =
        'https://signed.r2.cloudflarestorage.com/bucket/key?sig=abc'
      mockSign.mockResolvedValueOnce({ url: mockSignedUrl })

      const response = await postPresign(validRequest)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('uploadUrl', mockSignedUrl)
      expect(data).toHaveProperty('objectKey')
      expect(data).toHaveProperty('expiresIn', 900)
    })

    it('should return 400 when contentType is invalid', async () => {
      const response = await postPresign(invalidRequestInvalidContentType)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 when contentType is missing', async () => {
      const response = await postPresign(invalidRequestMissingContentType)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 when fileSizeBytes is too large', async () => {
      const response = await postPresign(invalidRequestTooLarge)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 when required fields are missing', async () => {
      const response = await postPresign(invalidRequestMissingFileName)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 500 when request body is not JSON', async () => {
      const response = await app.request('/v1/uploads/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not json',
      })

      expect(response.status).toBe(500)
    })

    it('should generate unique object key with UUID', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })

      await postPresign(validRequest)

      expect(mockSign).toHaveBeenCalledWith(
        expect.stringMatching(/anonymous\/[a-f0-9-]+\/photo\.jpg/),
        expect.any(Object),
      )
    })

    it('should sanitize special characters from fileName in object key', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })

      await postPresign({
        fileName: 'my photo (1).jpg',
        contentType: 'image/jpeg',
        fileSizeBytes: 1024,
      })

      expect(mockSign).toHaveBeenCalledWith(
        expect.stringMatching(/anonymous\/[a-f0-9-]+\/myphoto1\.jpg/),
        expect.any(Object),
      )
    })

    it('should return 400 when request body is empty object', async () => {
      const response = await postPresign(invalidRequestEmptyBody)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 500 when aws4fetch throws error', async () => {
      mockSign.mockRejectedValueOnce(new Error('AWS error'))

      const response = await postPresign(validRequest)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Failed to generate presigned URL')
    })

    it('should use AwsClient with correct credentials', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })

      await postPresign(validRequest)

      expect(AwsClient).toHaveBeenCalledWith({
        accessKeyId: mockEnv.R2_ACCESS_KEY_ID,
        secretAccessKey: mockEnv.R2_SECRET_ACCESS_KEY,
        region: 'auto',
        service: 's3',
      })
    })

    it('should sign with PUT method and correct headers', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })

      await postPresign(validRequest)

      expect(mockSign).toHaveBeenCalledWith(
        expect.stringContaining(mockEnv.R2_UPLOADS_RAW_NAME),
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'image/jpeg',
            'Content-Length': validRequest.fileSizeBytes.toString(),
          },
          aws: { signQuery: true, allHeaders: true },
        }),
      )
    })

    it('should include correct expiry in R2 URL', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })

      await postPresign(validRequest)

      expect(mockSign).toHaveBeenCalledWith(
        expect.stringContaining('X-Amz-Expires=900'),
        expect.any(Object),
      )
    })
  })

  // CORS headers suite
  describe('CORS headers', () => {
    it('should include CORS headers in response', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })

      const response = await app.request('/v1/uploads/presign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        body: JSON.stringify(validRequest),
      })

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:5173',
      )
    })
  })
})
