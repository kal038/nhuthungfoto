// Hono custom middleware to verify bearer token found on a request
// If token is valid, add user info to context, forward to next
// If invalid return 401 unauthorized
// Note: Supabase recently migrated their auth model to ES256 (asymmetric)
// This means that we can no longer use a shared secret to sign and verify tokens
// Supabase now is the sole issuer of JWT keys and we can only use a public key
// called JWKS to verify tokens on our backend.
// This key could be rotated out so its best to cache it for only an hour and re-fetch later
// Either this or you have to call sdk.auth.getUser to verify a request every-single-time
// Basically Supabase is now the authoritative figure for issuing JWTs
// You (your backend) can now only verify the integrity of the token with a JWKS fetched from Supabase

import type { Env } from '../types/env'
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
  await jwk({
    jwks_uri: `${c.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    alg: ['ES256'],
    allow_anon: false,
  })(c, async () => {
    const payload = c.get('jwtPayload')
    c.set('user', {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'authenticated',
    })
    await next()
  })
})
