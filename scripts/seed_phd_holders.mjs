import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws_lib from 'ws'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase env vars.")
  process.exit(1)
}

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  realtime: { transport: ws_lib }
})

const file2025 = 'public/templates/Quantum_Pulse_Gugan_Faculty_Details_2025-2026_only (1).xlsx'
const file2026 = 'public/templates/Quantum_Pulse_Gugan_Faculty_Details_2026-2027_only.xlsx'

function parsePhds(filePath) {
  try {
    const wb = XLSX.readFile(filePath)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
    let sno = 1
    const faculty = []
    for (const row of data) {
      const name = String(row['Name of the Faculty'] || '').trim()
      if (name) {
        const empId = String(row['Emp.ID'] || '').trim()
        if (!empId) {
          console.warn(`Skipping ${name} as they have no Employee ID`)
          continue
        }
        const isPhd = String(row['Type']).trim() === 'Doctorate' || name.startsWith('Dr.')
        faculty.push({
          s_no: sno++,
          name: name,
          dept: String(row['Dept.']).trim(),
          emp_id: empId,
          is_phd: isPhd
        })
      }
    }
    return faculty
  } catch (err) {
    console.error("Error reading file:", filePath, err)
    return []
  }
}

async function main() {
  console.log("📖 Reading Excel files...")
  
  const faculty2025 = parsePhds(file2025).map(r => ({ ...r, academic_year: '2025' }))
  const faculty2026 = parsePhds(file2026).map(r => ({ ...r, academic_year: '2026' }))
  
  console.log(`✅ Found ${faculty2025.length} faculty members in 2025.`)
  console.log(`✅ Found ${faculty2026.length} faculty members in 2026.`)

  const combined = [...faculty2025, ...faculty2026]

  if (combined.length > 0) {
    console.log("🗑️ Clearing existing legacy_phd_holders table...")
    await admin.from('legacy_phd_holders').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    console.log("⬆ Upserting faculty rosters...")
    const { error } = await admin.from('legacy_phd_holders').insert(combined)
    if (error) {
      console.error("❌ Error inserting data:", error)
    } else {
      console.log("🎉 Successfully seeded faculty rosters for 2025 and 2026.")
    }
  } else {
    console.log("No faculty found.")
  }
}

main().catch(console.error)
