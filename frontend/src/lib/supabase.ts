//Init supabase client with Vite env vars
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const Key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(URL, Key)
