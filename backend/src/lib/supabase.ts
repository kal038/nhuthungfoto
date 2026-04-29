import { createClient } from '@supabase/supabase-js'
import { type Env } from '../types/env'

export function createServiceClient(env: Env) {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = env

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error(
      'Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SECRET_KEY',
    )
  }

  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
