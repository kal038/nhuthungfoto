import type { Database } from '@/types/database.types'
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const Key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(URL, Key)
;(window as any).supabase = supabase
