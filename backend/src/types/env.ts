/**
 * Cloudflare Workers environment bindings.
 *
 * Native R2 bindings are injected by the runtime via wrangler.jsonc.
 * Secrets are set via `wrangler secret put` (prod) or `.dev.vars` (local).
 * Vars are set in wrangler.jsonc under "vars".
 */
export interface Env {
  // ---------------------
  // R2 Buckets (native bindings)
  // ---------------------
  R2_UPLOADS_RAW: R2Bucket
  R2_PORTFOLIO_PUBLIC: R2Bucket

  // ---------------------
  // R2 S3-compatible API (secrets — for pre-signed URLs)
  // ---------------------
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
  CLOUDFLARE_ACCOUNT_ID: string

  // ---------------------
  // Supabase (secrets)
  // ---------------------
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string

  // ---------------------
  // Config vars
  // ---------------------
  FRONTEND_URL: string
}
