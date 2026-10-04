import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws_lib from 'ws'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws_lib } }
)

const FILE_2025 = 'public/templates/Quantum_Pulse_Gugan_Faculty_Details_2025-2026_only (1).xlsx'
const FILE_2026 = 'public/templates/Quantum_Pulse_Gugan_Faculty_Details_2026-2027_only.xlsx'

async function main() {
  console.log('📖 Reading Excel files to find valid Employee IDs...')
  
  const wb2025 = XLSX.readFile(FILE_2025)
  const data2025 = XLSX.utils.sheet_to_json(wb2025.Sheets[wb2025.SheetNames[0]], { defval: '' })
  
  const wb2026 = XLSX.readFile(FILE_2026)
  const data2026 = XLSX.utils.sheet_to_json(wb2026.Sheets[wb2026.SheetNames[0]], { defval: '' })
  
  const validIds = new Set()

  for (const row of data2025) {
    const empId = String(row['Emp.ID'] || '').trim()
    if (empId) validIds.add(empId)
  }

  for (const row of data2026) {
    const empId = String(row['Emp.ID'] || '').trim()
    if (empId) validIds.add(empId)
  }

  console.log(`✅ Found ${validIds.size} unique valid Employee IDs from the two Excel files.`)

  console.log('📋 Fetching current master_faculty from DB...')
  const { data: dbFaculty, error: fetchErr } = await supabase.from('master_faculty').select('emp_id, name, dept')
  if (fetchErr) {
    console.error('Error fetching db faculty:', fetchErr)
    return
  }
  
  console.log(`Found ${dbFaculty.length} existing faculty in DB.`)

  const idsToDelete = []
  
  for (const f of dbFaculty) {
    if (!validIds.has(f.emp_id)) {
      idsToDelete.push(f.emp_id)
      console.log(`❌ Invalid/Ghost ID found: ${f.emp_id} | ${f.name} | ${f.dept}`)
    }
  }

  if (idsToDelete.length === 0) {
    console.log('🎉 No ghost faculty found. master_faculty is already perfectly clean!')
    return
  }

  console.log(`\n🗑️ Deleting ${idsToDelete.length} invalid/ghost faculty from master_faculty...`)
  
  // Delete in batches
  for (let i = 0; i < idsToDelete.length; i += 50) {
    const batch = idsToDelete.slice(i, i + 50)
    const { error: delErr } = await supabase.from('master_faculty').delete().in('emp_id', batch)
    if (delErr) {
      console.error(`Error deleting batch ${i}:`, delErr)
    } else {
      console.log(`   Deleted batch ${i} to ${i + batch.length}`)
    }
  }

  console.log('✅ Cleanup complete! Only valid Employee IDs from the Excel files remain in the DB.')
}

main().catch(console.error)
