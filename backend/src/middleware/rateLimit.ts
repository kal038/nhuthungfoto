import { rateLimiter } from 'hono-rate-limiter'
import type { Env } from '../types/env'

export const myRateLimiter = rateLimiter<{ Bindings: Env }>({
  binding: (c) => c.env.RATE_LIMITER,
  keyGenerator: (c) => c.req.header('CF-Connecting-IP') || 'unknown',
})
