import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { healthRouter } from './routes/health'
import { uploadsRouter } from './routes/uploads'
import { myRateLimiter } from './middleware/rateLimit'
import { authMiddleware } from './middleware/auth'
import type { Env } from './types/env'

const app = new Hono<{ Bindings: Env }>()

// ---------------------
// Middleware
// ---------------------
app.use('*', myRateLimiter)
app.use('*', secureHeaders())
app.use('*', (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
  return corsMiddleware(c, next)
})

// ---------------------
// Routes
// ---------------------
app.use('/v1/*', authMiddleware)
app.route('/v1', healthRouter)
app.route('/v1/presign', uploadsRouter)

export default app
