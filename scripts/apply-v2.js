const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20240117000000_announcements_v2.sql'),
  'utf8'
)

async function main() {
  console.log('Applying announcements migration...')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('Error applying migration:', res.status, text)
    return
  }
  console.log('Migration applied successfully!')
}

main().catch(console.error)
