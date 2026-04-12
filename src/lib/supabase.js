import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
  console.error(
    '❌ Supabase credentials missing! ' +
    'If you are on Vercel, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Environment Variables. ' +
    'Local development requires these in .env.local'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
