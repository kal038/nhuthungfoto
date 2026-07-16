import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import type { Env } from '@/types/env'
import { galleryRouter } from '@/routes/gallery'
import { AppError } from '@/lib/errors'

const mockFrom = vi.fn()
const mockProfileSelect = vi.fn()
const mockProfileEq = vi.fn()
const mockProfileSingle = vi.fn()
const mockSubmissionsSelect = vi.fn()
const mockSubmissionsEq = vi.fn()
const mockSubmissionsOrder = vi.fn()

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: mockProfileSelect.mockReturnValue({
            eq: mockProfileEq.mockReturnValue({
              single: mockProfileSingle,
            }),
          }),
        }
      }
      if (table === 'submissions') {
        return {
          select: mockSubmissionsSelect.mockReturnValue({
            eq: mockSubmissionsEq.mockReturnValue({
              order: mockSubmissionsOrder,
            }),
          }),
        }
      }
      return {}
    }),
  })),
}))

describe('Gallery Route', () => {
  let app: Hono<{ Bindings: Env; Variables: { user: { id: string } } }>

  const mockEnv: Env = {
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SECRET_KEY: 'test-secret-key',
    FRONTEND_URL: 'http://localhost:5173',
    R2_UPLOADS_RAW_PUBLIC_URL: 'https://pub-xxx.r2.dev',
    R2_PORTFOLIO_PUBLIC_URL: 'https://pub-yyy.r2.dev',
  } as Env

  beforeEach(() => {
    app = new Hono<{ Bindings: Env; Variables: { user: { id: string } } }>()
    app.use('*', async (c, next) => {
      c.env = mockEnv
      c.set('user', { id: 'test-user' })
      await next()
    })
    app.route('/v1/gallery', galleryRouter)
    app.onError((err, c) => {
      console.error(err)
      if (err instanceof AppError) {
        return c.json({ error: err.message }, err.status)
      }
      return c.json({ error: 'Internal Server Error' }, 500)
    })
    vi.clearAllMocks()
    mockProfileSingle.mockReset()
    mockSubmissionsOrder.mockReset()
  })

  it('should return profile and submissions for a valid username', async () => {
    const mockProfile = {
      id: 'user-456',
      username: 'nhuthung',
      avatar_url: 'https://example.com/a.jpg',
      skill_level: 'BEGINNER',
    }
    mockProfileSingle.mockResolvedValueOnce({ data: mockProfile, error: null })
    mockSubmissionsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'sub-789',
          user_id: 'user-456',
          module_id: null,
          original_photo_key: 'user-456/sub-789/photo.jpg',
          processed_photo_key: 'user-456/sub-789/photo.webp',
          status: 'UPLOADED',
          review_type: 'AI',
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    })

    const response = await app.request('/v1/gallery/nhuthung')

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.profile).toEqual(mockProfile)
    expect(data.submissions).toHaveLength(1)
    expect(data.submissions[0]).toHaveProperty('id', 'sub-789')
    expect(data.submissions[0]).toHaveProperty(
      'originalPhotoUrl',
      'https://pub-xxx.r2.dev/user-456/sub-789/photo.jpg',
    )
    expect(data.submissions[0]).toHaveProperty(
      'processedPhotoUrl',
      'https://pub-yyy.r2.dev/user-456/sub-789/photo.webp',
    )
  })

  it('should return profile with empty submissions array when user has no submissions', async () => {
    const mockProfile = {
      id: 'user-456',
      username: 'nhuthung',
      avatar_url: null,
      skill_level: null,
    }
    mockProfileSingle.mockResolvedValueOnce({ data: mockProfile, error: null })
    mockSubmissionsOrder.mockResolvedValueOnce({ data: [], error: null })

    const response = await app.request('/v1/gallery/nhuthung')

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.profile).toEqual(mockProfile)
    expect(data.submissions).toEqual([])
  })

  it('should return 404 for non-existent username and never query submissions', async () => {
    mockProfileSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    const response = await app.request('/v1/gallery/nonexistent')

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data).toHaveProperty('error', 'User not found')

    // Verify submissions table was never queried
    expect(mockSubmissionsSelect).not.toHaveBeenCalled()
    expect(mockSubmissionsOrder).not.toHaveBeenCalled()
  })

  it('should return 500 when submissions query fails after successful profile lookup', async () => {
    mockProfileSingle.mockResolvedValueOnce({
      data: { id: 'user-456', username: 'nhuthung', avatar_url: null, skill_level: null },
      error: null,
    })
    mockSubmissionsOrder.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    })

    const response = await app.request('/v1/gallery/nhuthung')

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data).toHaveProperty('error', 'Failed to fetch submissions')
  })

  it('should lowercase the username before profile lookup', async () => {
    mockProfileSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    })

    await app.request('/v1/gallery/NhuThung')

    expect(mockProfileEq).toHaveBeenCalledWith('username', 'nhuthung')
  })

  it('should resolve R2 URLs correctly for submissions with photo keys', async () => {
    mockProfileSingle.mockResolvedValueOnce({
      data: { id: 'user-456', username: 'nhuthung', avatar_url: null, skill_level: null },
      error: null,
    })
    mockSubmissionsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'sub-001',
          user_id: 'user-456',
          module_id: 'mod-1',
          original_photo_key: 'user-456/sub-001/raw.jpg',
          processed_photo_key: 'user-456/sub-001/final.webp',
          status: 'REVIEWED',
          review_type: 'HUMAN',
          created_at: '2024-06-15T12:00:00.000Z',
        },
      ],
      error: null,
    })

    const response = await app.request('/v1/gallery/nhuthung')

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.submissions[0].originalPhotoUrl).toBe(
      'https://pub-xxx.r2.dev/user-456/sub-001/raw.jpg',
    )
    expect(data.submissions[0].processedPhotoUrl).toBe(
      'https://pub-yyy.r2.dev/user-456/sub-001/final.webp',
    )
  })

  it('should return null URLs when photo keys are null', async () => {
    mockProfileSingle.mockResolvedValueOnce({
      data: { id: 'user-456', username: 'nhuthung', avatar_url: null, skill_level: null },
      error: null,
    })
    mockSubmissionsOrder.mockResolvedValueOnce({
      data: [
        {
          id: 'sub-002',
          user_id: 'user-456',
          module_id: null,
          original_photo_key: null,
          processed_photo_key: null,
          status: 'PENDING',
          review_type: null,
          created_at: '2024-06-15T12:00:00.000Z',
        },
      ],
      error: null,
    })

    const response = await app.request('/v1/gallery/nhuthung')

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.submissions[0].originalPhotoUrl).toBeNull()
    expect(data.submissions[0].processedPhotoUrl).toBeNull()
  })
})
