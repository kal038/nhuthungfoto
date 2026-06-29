import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from '@/types/env'
import { submissionsRouter } from '@/routes/submissions'
import { AwsClient } from 'aws4fetch'
import { AppError } from '@/lib/errors'

const mockSign = vi.fn()
const mockFrom = vi.fn()
const mockInsert = vi.fn()
const mockInsertSelect = vi.fn()
const mockSingle = vi.fn()
const mockListSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()

// Mock crypto.randomUUID for deterministic tests
vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue('sub-123'),
})

// Mock aws4fetch
vi.mock('aws4fetch', () => ({
  AwsClient: vi.fn().mockImplementation(function () {
    return { sign: mockSign }
  }),
}))

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: mockFrom.mockReturnValue({
      insert: mockInsert.mockReturnValue({
        select: mockInsertSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
      select: mockListSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          order: mockOrder,
        }),
      }),
    }),
  })),
}))

// Submissions route suite
describe('Submissions Route', () => {
  let app: Hono<{ Bindings: Env }>

  const mockEnv: Env = {
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
    R2_UPLOADS_RAW_NAME: 'test-uploads-bucket',
    R2_UPLOADS_RAW_PUBLIC_URL: 'https://pub-xxx.r2.dev',
    R2_PORTFOLIO_PUBLIC_URL: 'https://pub-yyy.r2.dev',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SECRET_KEY: 'test-secret-key',
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
    app = new Hono<{ Bindings: Env; Variables: { user: { id: string } } }>()
    app.use('*', async (c, next) => {
      c.env = mockEnv
      c.set('user', { id: 'test-user' })
      await next()
    })
    app.use('*', (c, next) => {
      const corsMiddleware = cors({
        origin: mockEnv.FRONTEND_URL || 'http://localhost:5173',
        credentials: true,
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      })
      return corsMiddleware(c, next)
    })
    app.route('/v1/submissions', submissionsRouter)
    app.onError((err, c) => {
      console.error(err)
      if (err instanceof AppError) {
        return c.json({ error: err.message }, err.status)
      }
      return c.json({ error: 'Internal Server Error' }, 500)
    })
    vi.clearAllMocks()
  })

  function postSubmissions(body: unknown, headers?: Record<string, string>) {
    return app.request('/v1/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  }

  // Presign endpoint suite
  describe('POST /v1/submissions', () => {
    it('should return 200 with presigned URL result and submissionId', async () => {
      const mockSignedUrl =
        'https://signed.r2.cloudflarestorage.com/bucket/key?sig=abc'
      mockSign.mockResolvedValueOnce({ url: mockSignedUrl })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'sub-123', original_photo_key: 'test-user/sub-123/photo.jpg' },
        error: null,
      })

      const response = await postSubmissions(validRequest)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('uploadUrl', mockSignedUrl)
      expect(data).toHaveProperty('objectKey', 'test-user/sub-123/photo.jpg')
      expect(data).toHaveProperty('submissionId', 'sub-123')
      expect(data).toHaveProperty('expiresIn', 900)
    })

    it('should return 400 when contentType is invalid', async () => {
      const response = await postSubmissions(invalidRequestInvalidContentType)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 when contentType is missing', async () => {
      const response = await postSubmissions(invalidRequestMissingContentType)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 when fileSizeBytes is too large', async () => {
      const response = await postSubmissions(invalidRequestTooLarge)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 when required fields are missing', async () => {
      const response = await postSubmissions(invalidRequestMissingFileName)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 when request body is not JSON', async () => {
      const response = await app.request('/v1/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not json',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Request body must be valid JSON')
    })

    it('should generate object key with submissionId', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'sub-123', original_photo_key: 'test-user/sub-123/photo.jpg' },
        error: null,
      })

      await postSubmissions(validRequest)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sub-123',
          user_id: 'test-user',
          original_photo_key: 'test-user/sub-123/photo.jpg',
        }),
      )
      expect(mockSign).toHaveBeenCalledWith(
        expect.stringMatching(/test-user\/sub-123\/photo\.jpg/),
        expect.any(Object),
      )
    })

    it('should sanitize special characters from fileName in object key', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'sub-123', original_photo_key: 'test-user/sub-123/myphoto1.jpg' },
        error: null,
      })

      await postSubmissions({
        fileName: 'my photo (1).jpg',
        contentType: 'image/jpeg',
        fileSizeBytes: 1024,
      })

      expect(mockSign).toHaveBeenCalledWith(
        expect.stringMatching(/test-user\/sub-123\/myphoto1\.jpg/),
        expect.any(Object),
      )
    })

    it('should return 400 when request body is empty object', async () => {
      const response = await postSubmissions(invalidRequestEmptyBody)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 502 when aws4fetch throws error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'sub-123', original_photo_key: 'test-user/sub-123/photo.jpg' },
        error: null,
      })
      mockSign.mockRejectedValueOnce(new Error('AWS error'))

      const response = await postSubmissions(validRequest)

      expect(response.status).toBe(502)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Failed to generate presigned URL')
    })

    it('should return 500 when Supabase insert fails', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const response = await postSubmissions(validRequest)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Failed to create db record: Database error')
    })

    it('should use AwsClient with correct credentials', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'sub-123', original_photo_key: 'test-user/sub-123/photo.jpg' },
        error: null,
      })

      await postSubmissions(validRequest)

      expect(AwsClient).toHaveBeenCalledWith({
        accessKeyId: mockEnv.R2_ACCESS_KEY_ID,
        secretAccessKey: mockEnv.R2_SECRET_ACCESS_KEY,
        region: 'auto',
        service: 's3',
      })
    })

    it('should sign with PUT method and correct headers', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'sub-123', original_photo_key: 'test-user/sub-123/photo.jpg' },
        error: null,
      })

      await postSubmissions(validRequest)

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
      mockSingle.mockResolvedValueOnce({
        data: { id: 'sub-123', original_photo_key: 'test-user/sub-123/photo.jpg' },
        error: null,
      })

      await postSubmissions(validRequest)

      expect(mockSign).toHaveBeenCalledWith(
        expect.stringContaining('X-Amz-Expires=900'),
        expect.any(Object),
      )
    })
  })

  describe('GET /v1/submissions/me', () => {
    it('should return submissions with resolved URLs', async () => {
      mockOrder.mockResolvedValueOnce({
        data: [
          {
            id: 'sub-123',
            user_id: 'test-user',
            module_id: null,
            original_photo_key: 'test-user/sub-123/photo.jpg',
            processed_photo_key: 'test-user/sub-123/photo.webp',
            status: 'UPLOADED',
            review_type: 'AI',
            created_at: '2024-01-01T00:00:00.000Z',
          },
        ],
        error: null,
      })

      const response = await app.request('/v1/submissions/me', {
        headers: { Authorization: 'Bearer test-token' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.submissions).toHaveLength(1)
      expect(data.submissions[0]).toHaveProperty('id', 'sub-123')
      expect(data.submissions[0]).toHaveProperty(
        'originalPhotoUrl',
        'https://pub-xxx.r2.dev/test-user/sub-123/photo.jpg',
      )
      expect(data.submissions[0]).toHaveProperty(
        'processedPhotoUrl',
        'https://pub-yyy.r2.dev/test-user/sub-123/photo.webp',
      )
    })

    it('should return empty array when user has no submissions', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      const response = await app.request('/v1/submissions/me', {
        headers: { Authorization: 'Bearer test-token' },
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.submissions).toEqual([])
    })

    it('should return 500 when Supabase query fails', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

      const response = await app.request('/v1/submissions/me', {
        headers: { Authorization: 'Bearer test-token' },
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Failed to fetch submissions')
    })
  })

  // CORS headers suite
  describe('CORS headers', () => {
    it('should include CORS headers in POST response', async () => {
      mockSign.mockResolvedValueOnce({ url: 'https://signed.example.com' })
      mockSingle.mockResolvedValueOnce({
        data: { id: 'sub-123', original_photo_key: 'test-user/sub-123/photo.jpg' },
        error: null,
      })

      const response = await app.request('/v1/submissions', {
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
