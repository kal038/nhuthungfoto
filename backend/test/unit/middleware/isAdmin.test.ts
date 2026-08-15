import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import type { Env } from '@/types/env'
import type { AuthVars } from '@/middleware/auth'
import { isAdminMiddleware } from '@/middleware/isAdmin'
import { AppError } from '@/lib/errors'

type AppEnv = { Bindings: Env; Variables: { user: AuthVars } }

/**
 * Helper: creates a mini Hono app with a fake user injected into context,
 * then the isAdminMiddleware guarding a test route.
 */
function createApp(adminEmails: string) {
  const app = new Hono<AppEnv>()

  // Mirror the real app's error handler so AppError maps to correct status
  app.onError((err, c) => {
    if (err instanceof AppError) {
      return c.json({ error: err.message }, err.status as 403)
    }
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  // Inject env
  app.use('*', async (c, next) => {
    c.env = { ADMIN_EMAILS: adminEmails } as Env
    await next()
  })

  return app
}

function withUser(app: Hono<AppEnv>, email?: string) {
  // Inject a fake user into context (simulating authMiddleware)
  app.use('*', async (c, next) => {
    c.set('user', { id: 'user-123', email, role: 'authenticated' })
    await next()
  })

  // Apply admin middleware
  app.use('*', isAdminMiddleware)

  // Test route
  app.get('/admin/test', (c) => c.json({ ok: true }))

  return app
}

describe('isAdminMiddleware', () => {
  it('allows request when email is in the allowlist', async () => {
    const app = createApp('admin@test.com,other@test.com')
    withUser(app, 'admin@test.com')

    const res = await app.request('/admin/test')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('allows request with case-insensitive email match', async () => {
    const app = createApp('Admin@Test.com')
    withUser(app, 'admin@test.com')

    const res = await app.request('/admin/test')
    expect(res.status).toBe(200)
  })

  it('allows request when email has whitespace in env var', async () => {
    const app = createApp('  admin@test.com , other@test.com  ')
    withUser(app, 'admin@test.com')

    const res = await app.request('/admin/test')
    expect(res.status).toBe(200)
  })

  it('rejects request when email is not in allowlist', async () => {
    const app = createApp('admin@test.com')
    withUser(app, 'student@test.com')

    const res = await app.request('/admin/test')
    expect(res.status).toBe(403)
  })

  it('rejects request when user has no email', async () => {
    const app = createApp('admin@test.com')
    withUser(app, undefined)

    const res = await app.request('/admin/test')
    expect(res.status).toBe(403)
  })

  it('rejects request when ADMIN_EMAILS is empty', async () => {
    const app = createApp('')
    withUser(app, 'admin@test.com')

    const res = await app.request('/admin/test')
    expect(res.status).toBe(403)
  })
})
