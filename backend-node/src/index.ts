import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { healthRouter } from './routes/health.js'

const app = new Hono()
const PORT = process.env.PORT || 3001

// ---------------------
// Middleware
// ---------------------
app.use('*', secureHeaders())
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
)

// ---------------------
// Routes
// ---------------------
app.route('/v1', healthRouter)

// ---------------------
// Start
// ---------------------
console.log(`nhuthungfoto API running on http://localhost:${PORT}`)
console.log(`Health check: http://localhost:${PORT}/v1/health`)

export default {
  port: PORT,
  fetch: app.fetch,
}
