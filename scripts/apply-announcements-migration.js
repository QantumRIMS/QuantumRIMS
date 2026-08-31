/**
 * run: node scripts/apply-announcements-migration.js
 * Applies the announcements migration directly to Supabase via the REST API.
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20240117000000_announcements_v2.sql'),
  'utf8'
)

async function main() {
  console.log('Applying announcements migration...')
  const { error } = await supabase.rpc('exec_sql', { query: sql }).catch(() => ({ error: 'rpc not available' }))
  if (error) {
    // Try running via pg REST endpoint
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: sql })
    })
    if (!res.ok) {
      console.log('Automatic migration not possible. Please run the SQL manually in Supabase Dashboard.')
      console.log('\n--- SQL to run ---\n')
      console.log(sql)
      return
    }
  }
  console.log('Migration applied successfully!')
}

main().catch(console.error)
