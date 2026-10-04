import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws_lib from 'ws'
dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws_lib } })
async function go() {
  let {data} = await supabase.from('master_faculty').select('name, emp_id').ilike('name', '%Sreemathy%')
  console.log('Master Faculty:', data)
  let {data: pub} = await supabase.from('legacy_publications').select('faculty_name, emp_id').ilike('faculty_name', '%Sreemathy%').limit(5)
  console.log('Publications:', pub)
}
go()
