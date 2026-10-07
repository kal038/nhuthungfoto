/**
 * Hono middleware verifying a bearer token: valid adds the user to context, invalid returns 401.
 * Supabase uses ES256 asymmetric JWTs verified via its public JWKS endpoint (Hono's jwk caches/rotates).
 */

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
    // Run next middleware or forward to handler.
    await next()
  })
})
