import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws from 'ws'
dotenv.config({ path: './.env.local' })

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws }
})

async function check() {
  const { data, error } = await admin.rpc('reload_schema_if_needed_or_just_query', {})
  console.log(data, error)
}
check()
