// Hono custom middleware to verify bearer token found on a request
// If token is valid, add user info to context, forward to next
// If invalid return 401 unauthorized
//
// Supabase uses ES256 (asymmetric JWTs). We verify tokens using their
// public JWKS endpoint — no shared secret needed. The JWKS key may rotate,
// so Hono's jwk() middleware handles caching and re-fetching automatically.

import type { Env } from '@/types/env'
import { createMiddleware } from 'hono/factory'
import { jwk } from 'hono/jwk'

export interface AuthVars {
  id: string
  email?: string
  role: string
}

export interface JwtPayload {
  sub: string
  email?: string
  role?: string
}

export const authMiddleware = createMiddleware<{
  Bindings: Env
  Variables: { user: AuthVars; jwtPayload: JwtPayload }
}>(async (c, next) => {
  // Step 1: Verify Bearer token against Supabase's JWKS
  const verify = jwk({
    jwks_uri: `${c.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    alg: ['ES256'],
    allow_anon: false,
  })

  // Step 2: Run verification, then enrich context with typed user
  await verify(c, async () => {
    const payload = c.get('jwtPayload')
    c.set('user', {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'authenticated',
    })
    await next() //run next middleware or to handler if done with all middlwares
  })
})
