import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { healthRouter } from './routes/health'
import { submissionsRouter } from './routes/submissions'
import { myRateLimiter } from './middleware/rateLimit'
import { authMiddleware } from './middleware/auth'
import type { Env } from './types/env'
import { portfolioRouter } from './routes/portfolio'
import { profileRouter } from './routes/profile'
import { AppError } from './lib/errors'

const app = new Hono<{ Bindings: Env }>()

// ---------------------
// Middleware
// ---------------------
app.use('*', logger())
app.use('*', (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  return corsMiddleware(c, next)
})
app.use('*', myRateLimiter)
app.use('*', secureHeaders())

app.onError((err, c) => {
  console.error(err)

  if (err instanceof AppError) {
    return c.json({ error: err.message }, err.status as ContentfulStatusCode)
  }

  return c.json({ error: 'Internal Server Error' }, 500)
})

// ---------------------
// Routes Public
// ---------------------
app.route('/health', healthRouter)
app.route('/portfolio', portfolioRouter)

// ---------------------
// Routes Protected
// ---------------------
app.use('/v1/*', authMiddleware)
app.route('/v1/submissions', submissionsRouter)
app.route('/v1/profile', profileRouter)

export default app
