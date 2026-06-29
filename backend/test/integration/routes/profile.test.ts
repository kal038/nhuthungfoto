import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { profileRouter } from '@/routes/profile'
import { AppError } from '@/lib/errors'

const mockFrom = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()
const mockGetEq = vi.fn()
const mockGetSingle = vi.fn()

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: mockFrom.mockReturnValue({
      update: mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          select: mockSelect.mockReturnValue({
            single: mockSingle,
          }),
        }),
      }),
      select: mockSelect.mockImplementation((columns: string) => {
        if (columns === 'id, username, avatar_url, skill_level') {
          return {
            eq: mockGetEq.mockReturnValue({
              single: mockGetSingle,
            }),
          }
        }
        if (columns === undefined || columns === '*') {
          // Inside update chain: .update().eq().select().single()
          return {
            single: mockSingle,
          }
        }
        return {
          eq: mockEq.mockReturnValue({
            select: mockSelect.mockReturnValue({
              single: mockSingle,
            }),
          }),
        }
      }),
    }),
  })),
}))

describe('Profile Route', () => {
  let app: Hono<{ Bindings: Env; Variables: { user: { id: string } } }>

  const mockEnv: Env = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SECRET_KEY: 'test-secret-key',
    FRONTEND_URL: 'http://localhost:5173',
  } as Env

  const mockUser = { id: 'user-123' }

  beforeEach(() => {
    app = new Hono<{ Bindings: Env; Variables: { user: { id: string } } }>()
    app.use('*', async (c, next) => {
      c.env = mockEnv
      c.set('user', mockUser)
      await next()
    })
    app.route('/v1/profile', profileRouter)
    app.onError((err, c) => {
      console.error(err)
      if (err instanceof AppError) {
        return c.json({ error: err.message }, err.status)
      }
      return c.json({ error: 'Internal Server Error' }, 500)
    })
    vi.clearAllMocks()
    mockSingle.mockReset()
    mockGetSingle.mockReset()
  })

  function patchProfile(body: unknown, headers?: Record<string, string>) {
    return app.request('/v1/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  }

  describe('PATCH /v1/profile', () => {
    it('should update profile with valid phone', async () => {
      const mockData = { id: 'user-123', phone: '0912345678' }
      mockSingle.mockResolvedValueOnce({ data: mockData, error: null })

      const response = await patchProfile({ phone: '0912345678' })

      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '0912345678',
          updated_at: expect.any(String),
        }),
      )
    })

    it('should update profile with valid avatarUrl', async () => {
      const mockData = { id: 'user-123', avatar_url: 'https://example.com/a.jpg' }
      mockSingle.mockResolvedValueOnce({ data: mockData, error: null })

      const response = await patchProfile({ avatarUrl: 'https://example.com/a.jpg' })

      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          avatar_url: 'https://example.com/a.jpg',
          updated_at: expect.any(String),
        }),
      )
    })

    it('should update all fields at once', async () => {
      const mockData = {
        id: 'user-123',
        phone: '0912345678',
        avatar_url: 'https://example.com/a.jpg',
      }
      mockSingle.mockResolvedValueOnce({ data: mockData, error: null })

      const response = await patchProfile({
        phone: '0912345678',
        avatarUrl: 'https://example.com/a.jpg',
      })

      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '0912345678',
          avatar_url: 'https://example.com/a.jpg',
          updated_at: expect.any(String),
        }),
      )
    })

    it('should only include provided fields in update payload', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })

      await patchProfile({ phone: '0912345678' })

      const updatePayload = mockUpdate.mock.calls[0][0]
      expect(updatePayload).toHaveProperty('phone')
      expect(updatePayload).toHaveProperty('updated_at')
      expect(updatePayload).not.toHaveProperty('avatar_url')
    })

    it('should always set updated_at', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })

      await patchProfile({})

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        }),
      )
    })

    it('should set avatar_url to null when empty string provided', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'user-123', avatar_url: null }, error: null })

      const response = await patchProfile({ avatarUrl: '' })

      expect(response.status).toBe(200)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          avatar_url: null,
        }),
      )
    })

    it('should reject username field in update payload', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })

      const response = await patchProfile({ username: 'newname' })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 for invalid phone format', async () => {
      const response = await patchProfile({ phone: '123' })
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 400 for invalid avatarUrl', async () => {
      const response = await patchProfile({ avatarUrl: 'not-a-url' })
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should return 502 when Supabase update fails', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const response = await patchProfile({ phone: '0912345678' })

      expect(response.status).toBe(502)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Failed to update profile')
    })

    it('should return 400 when request body is not JSON', async () => {
      const response = await app.request('/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not json',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Request body must be valid JSON')
    })

    it('should use the user id from context for the eq clause', async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null })

      await patchProfile({ phone: '0912345678' })

      expect(mockEq).toHaveBeenCalledWith('id', 'user-123')
    })
  })

  describe('GET /v1/profile/:username', () => {
    it('should return public profile by username', async () => {
      const mockData = {
        id: 'user-123',
        username: 'nhuthung',
        avatar_url: 'https://example.com/a.jpg',
        skill_level: 'BEGINNER',
      }
      mockGetSingle.mockResolvedValueOnce({ data: mockData, error: null })

      const response = await app.request('/v1/profile/nhuthung')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual(mockData)
      expect(mockGetEq).toHaveBeenCalledWith('username', 'nhuthung')
    })

    it('should return 404 when user not found', async () => {
      mockGetSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

      const response = await app.request('/v1/profile/nonexistent')

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'User not found')
    })
  })
})
