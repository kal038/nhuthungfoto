import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { healthRouter } from './routes/health.js'
import type { Env } from './types/env.js'

const app = new Hono<{ Bindings: Env }>()

// ---------------------
// Middleware
// ---------------------
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
app.route('/v1', healthRouter)

export default app
