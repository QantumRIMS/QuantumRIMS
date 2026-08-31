import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side client (anon key) — safe to use in browser components
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client — NEVER import this in client components
export function createAdminClient() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }) }
  })
}
