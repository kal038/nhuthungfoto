import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { authRouter } from '@/routes/auth'
import { AppError } from '@/lib/errors'

const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
        }),
      }),
    }),
  })),
}))

describe('Auth Route', () => {
  let app: Hono<{ Bindings: Env }>

  const mockEnv: Env = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SECRET_KEY: 'test-secret-key',
    FRONTEND_URL: 'http://localhost:5173',
  } as Env

  beforeEach(() => {
    app = new Hono<{ Bindings: Env }>()
    app.use('*', async (c, next) => {
      c.env = mockEnv
      await next()
    })
    app.route('/v1/auth', authRouter)
    app.onError((err, c) => {
      console.error(err)
      if (err instanceof AppError) {
        return c.json({ error: err.message }, err.status)
      }
      return c.json({ error: 'Internal Server Error' }, 500)
    })
    vi.clearAllMocks()
  })

  function postCheckUsername(body: unknown) {
    return app.request('/v1/auth/check-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  describe('POST /v1/auth/check-username', () => {
    it('should return available true for unused username', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      })

      const response = await postCheckUsername({ username: 'newuser' })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ available: true })
      expect(mockEq).toHaveBeenCalledWith('username', 'newuser')
    })

    it('should return available false for taken username', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'user-123' },
        error: null,
      })

      const response = await postCheckUsername({ username: 'takenuser' })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ available: false, reason: 'taken' })
    })

    it('should return available false for invalid username', async () => {
      const response = await postCheckUsername({ username: 'ab' })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ available: false, reason: 'invalid' })
    })

    it('should return available false for reserved username', async () => {
      const response = await postCheckUsername({ username: 'login' })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ available: false, reason: 'invalid' })
    })

    it('should return 400 when username is missing', async () => {
      const response = await postCheckUsername({})

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 when request body is not JSON', async () => {
      const response = await app.request('/v1/auth/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not json',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Request body must be valid JSON')
    })

    it('should return 500 when Supabase query fails unexpectedly', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'UNKNOWN', message: 'Database error' },
      })

      const response = await postCheckUsername({ username: 'newuser' })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Failed to check username')
    })
  })
})
