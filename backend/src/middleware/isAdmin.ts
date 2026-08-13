import { AppError } from '@/lib/errors'
import type { AuthVars } from '@/middleware/auth'
import type { Env } from '@/types/env'
import { createMiddleware } from 'hono/factory'

export const isAdminMiddleware = createMiddleware<{ Bindings: Env; Variables: { user: AuthVars } }>(
  async (c, next) => {
    //read in allowed admin emails from env
    const adminEmails = c.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase())
    const sessionEmail = c.get('user').email?.trim().toLowerCase()
    if (!sessionEmail || !adminEmails.includes(sessionEmail)) {
      throw new AppError('Forbidden, Not Admin', 403)
    }

    await next()
  },
)
