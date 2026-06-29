import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from '@/types/env'
import { portfolioRouter } from '@/routes/portfolio'
import { AppError } from '@/lib/errors'

describe('Portfolio Route', () => {
  let app: Hono<{ Bindings: Env }>

  const mockEnv: Env = {
    FRONTEND_URL: 'http://localhost:5173',
    R2_PORTFOLIO_PUBLIC_URL: 'https://pub-yyy.r2.dev',
  } as Env

  const createMockR2Object = (key: string, uploaded: Date) => ({
    key,
    uploaded,
    size: 1000,
    etag: 'etag',
    httpEtag: '"etag"',
    httpMetadata: {},
    customMetadata: {},
    range: undefined,
    checksums: {},
    storageClass: 'Standard',
    version: '1',
  })

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
        allowHeaders: ['Authorization', 'Content-Type'],
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      })
      return corsMiddleware(c, next)
    })
    app.route('/portfolio', portfolioRouter)
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  describe('GET /portfolio', () => {
    it('should return photos with key and uploaded fields', async () => {
      const mockR2Bucket = {
        list: vi.fn().mockResolvedValueOnce({
          objects: [
            createMockR2Object('prefix/photo1.jpg', new Date('2024-01-01')),
            createMockR2Object('prefix/photo2.jpg', new Date('2024-01-02')),
          ],
          truncated: false,
          cursor: undefined,
          delimitedPrefixes: [],
        }),
      }

      app = new Hono<{ Bindings: Env }>()
      app.use('*', async (c, next) => {
        c.env = { ...mockEnv, R2_PORTFOLIO_PUBLIC: mockR2Bucket as unknown as R2Bucket }
        await next()
      })
      app.use('*', (c, next) => {
        const corsMiddleware = cors({
          origin: mockEnv.FRONTEND_URL || 'http://localhost:5173',
          credentials: true,
        })
        return corsMiddleware(c, next)
      })
      app.route('/portfolio', portfolioRouter)

      const response = await app.request('/portfolio')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.photos).toHaveLength(2)
      expect(data.photos[0]).toHaveProperty('key', 'prefix/photo1.jpg')
      expect(data.photos[0]).toHaveProperty('url', 'https://pub-yyy.r2.dev/prefix/photo1.jpg')
      expect(data.photos[0]).toHaveProperty('uploaded', '2024-01-01T00:00:00.000Z')
    })

    it('should return empty array when bucket has no objects', async () => {
      const mockR2Bucket = {
        list: vi.fn().mockResolvedValueOnce({
          objects: [],
          truncated: false,
          cursor: undefined,
          delimitedPrefixes: [],
        }),
      }

      app = new Hono<{ Bindings: Env }>()
      app.use('*', async (c, next) => {
        c.env = { ...mockEnv, R2_PORTFOLIO_PUBLIC: mockR2Bucket as unknown as R2Bucket }
        await next()
      })
      app.route('/portfolio', portfolioRouter)

      const response = await app.request('/portfolio')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.photos).toEqual([])
    })

    it('should retry on R2 list failure and succeed on second attempt', async () => {
      const mockR2Bucket = {
        list: vi.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            objects: [createMockR2Object('prefix/photo.jpg', new Date('2024-01-01'))],
            truncated: false,
            cursor: undefined,
            delimitedPrefixes: [],
          }),
      }

      app = new Hono<{ Bindings: Env }>()
      app.use('*', async (c, next) => {
        c.env = { ...mockEnv, R2_PORTFOLIO_PUBLIC: mockR2Bucket as unknown as R2Bucket }
        await next()
      })
      app.route('/portfolio', portfolioRouter)

      const response = await app.request('/portfolio')

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.photos).toHaveLength(1)
      expect(mockR2Bucket.list).toHaveBeenCalledTimes(2)
    })

    it('should retry up to 3 times then return 500', async () => {
      const mockR2Bucket = {
        list: vi.fn().mockRejectedValue(new Error('Persistent failure')),
      }

      app = new Hono<{ Bindings: Env }>()
      app.use('*', async (c, next) => {
        c.env = { ...mockEnv, R2_PORTFOLIO_PUBLIC: mockR2Bucket as unknown as R2Bucket }
        await next()
      })
      app.route('/portfolio', portfolioRouter)
      app.onError((err, c) => {
        console.error(err)
        if (err instanceof AppError) {
          return c.json({ error: err.message }, err.status)
        }
        return c.json({ error: 'Internal Server Error' }, 500)
      })

      const response = await app.request('/portfolio')

      expect(response.status).toBe(502)
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Failed to load portfolio')
      expect(mockR2Bucket.list).toHaveBeenCalledTimes(3)
    })

    it('should delay between retries', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })

      const mockR2Bucket = {
        list: vi.fn()
          .mockRejectedValueOnce(new Error('Error 1'))
          .mockRejectedValueOnce(new Error('Error 2'))
          .mockResolvedValueOnce({
            objects: [createMockR2Object('prefix/photo.jpg', new Date('2024-01-01'))],
            truncated: false,
            cursor: undefined,
            delimitedPrefixes: [],
          }),
      }

      app = new Hono<{ Bindings: Env }>()
      app.use('*', async (c, next) => {
        c.env = { ...mockEnv, R2_PORTFOLIO_PUBLIC: mockR2Bucket as unknown as R2Bucket }
        await next()
      })
      app.route('/portfolio', portfolioRouter)

      const requestPromise = app.request('/portfolio')
      // Let async microtasks run + timers advance
      await vi.advanceTimersByTimeAsync(200)
      const response = await requestPromise

      expect(response.status).toBe(200)
      expect(mockR2Bucket.list).toHaveBeenCalledTimes(3)
      vi.useRealTimers()
    })

    it('should include CORS headers in response', async () => {
      const mockR2Bucket = {
        list: vi.fn().mockResolvedValueOnce({
          objects: [],
          truncated: false,
          cursor: undefined,
          delimitedPrefixes: [],
        }),
      }

      app = new Hono<{ Bindings: Env }>()
      app.use('*', async (c, next) => {
        c.env = { ...mockEnv, R2_PORTFOLIO_PUBLIC: mockR2Bucket as unknown as R2Bucket }
        await next()
      })
      app.use('*', (c, next) => {
        const corsMiddleware = cors({
          origin: mockEnv.FRONTEND_URL || 'http://localhost:5173',
          credentials: true,
        })
        return corsMiddleware(c, next)
      })
      app.route('/portfolio', portfolioRouter)

      const response = await app.request('/portfolio', {
        headers: { Origin: 'http://localhost:5173' },
      })

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        'http://localhost:5173',
      )
    })
  })
})
