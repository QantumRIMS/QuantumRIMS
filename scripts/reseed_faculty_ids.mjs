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

function normalizeName(name) {
  return name.replace(/^(Dr\.|Mr\.|Ms\.|Prof\.)\s*/i, '').replace(/\s+/g, '').toLowerCase().trim()
}

async function main() {
  console.log('📖 Reading Excel files...')
  
  const wb2025 = XLSX.readFile(FILE_2025)
  const data2025 = XLSX.utils.sheet_to_json(wb2025.Sheets[wb2025.SheetNames[0]], { defval: '' })
    .filter(r => r['Emp.ID'] && r['Emp.ID'].toString().trim())
  
  const wb2026 = XLSX.readFile(FILE_2026)
  const data2026 = XLSX.utils.sheet_to_json(wb2026.Sheets[wb2026.SheetNames[0]], { defval: '' })
    .filter(r => r['Emp.ID'] && r['Emp.ID'].toString().trim())
    
  const set2026 = new Set(data2026.map(r => String(r['Emp.ID']).trim()))
  
  // Combine lists with "Other " prefix for those only in 2025
  const fullRoster = []
  const seenIds = new Map()

  function getUniqueId(id) {
    if (!seenIds.has(id)) {
      seenIds.set(id, 1)
      return id
    }
    const count = seenIds.get(id) + 1
    seenIds.set(id, count)
    return `${id}_${count}`
  }
  
  for (const row of data2026) {
    fullRoster.push({
      emp_id: getUniqueId(String(row['Emp.ID']).trim()),
      name: String(row['Name of the Faculty']).trim(),
      dept: String(row['Dept.']).trim(),
      designation: String(row['Designation']).trim(),
      type: String(row['Type']).trim() || 'Doctorate'
    })
  }
  
  for (const row of data2025) {
    const origId = String(row['Emp.ID']).trim()
    if (!set2026.has(origId)) {
      fullRoster.push({
        emp_id: getUniqueId(origId),
        name: String(row['Name of the Faculty']).trim(),
        dept: 'Other ' + String(row['Dept.']).trim(),
        designation: String(row['Designation']).trim(),
        type: String(row['Type']).trim() || 'Doctorate'
      })
    }
  }
  
  console.log(`✅ Loaded ${fullRoster.length} total active/relieved faculty from Excel.`)
  
  console.log('📋 Fetching current DB master_faculty...')
  const { data: dbFaculty, error: fetchErr } = await supabase.from('master_faculty').select('*')
  if (fetchErr) {
    console.error('Error fetching db faculty:', fetchErr)
    return
  }
  
  console.log(`Found ${dbFaculty.length} existing faculty in DB.`)
  
  // Create mapping: Normalized DB Name -> DB emp_id
  const dbNameMap = new Map()
  for (const f of dbFaculty) {
    dbNameMap.set(normalizeName(f.name), f)
  }
  
  console.log('🔄 Re-mapping synthetic IDs to real IDs...')
  let renameCount = 0
  
  for (const f of fullRoster) {
    const normName = normalizeName(f.name)
    const dbMatch = dbNameMap.get(normName)
    
    if (dbMatch && dbMatch.emp_id !== f.emp_id) {
      // If we found a match but the emp_id differs (i.e. synthetic ID), update it!
      const { error: updErr } = await supabase
        .from('master_faculty')
        .update({ emp_id: f.emp_id })
        .eq('emp_id', dbMatch.emp_id)
        
      if (updErr) {
        console.error(`Failed to update ID for ${f.name} (from ${dbMatch.emp_id} to ${f.emp_id}):`, updErr.message)
      } else {
        renameCount++
        // Update local map so upsert later knows it's already updated
        dbMatch.emp_id = f.emp_id
      }
    }
  }
  console.log(`✅ Successfully updated ${renameCount} synthetic IDs to real Emp.IDs (Cascaded to targets).`)
  
  console.log('⬆ Upserting full roster to synchronize names/designations/departments...')
  
  // Upsert in batches of 50
  for (let i = 0; i < fullRoster.length; i += 50) {
    const batch = fullRoster.slice(i, i + 50)
    const { error: upsertErr } = await supabase.from('master_faculty').upsert(batch, { onConflict: 'emp_id' })
    if (upsertErr) {
      console.error(`Error upserting batch ${i}:`, upsertErr)
    } else {
      console.log(`   Upserted batch ${i} to ${i + batch.length}`)
    }
  }
  
  // The user requested to handle ghost faculty that are in DB but NOT in the new Excel files.
  // Rule: Keep them but prefix their department with "Other ".
  
  const excelEmpIds = new Set(fullRoster.map(f => f.emp_id))
  
  // Refetch to see current state
  const { data: refreshedDb } = await supabase.from('master_faculty').select('*')
  let unmatchedCount = 0
  
  for (const dbf of refreshedDb) {
    if (!excelEmpIds.has(dbf.emp_id) && !dbf.dept.startsWith('Other ')) {
      // This person is not in the new rosters, and their dept isn't prefixed yet.
      const newDept = 'Other ' + dbf.dept
      const { error: matchErr } = await supabase
        .from('master_faculty')
        .update({ dept: newDept })
        .eq('emp_id', dbf.emp_id)
      
      if (!matchErr) {
        unmatchedCount++
      }
    }
  }
  
  console.log(`✅ Applied 'Other ' prefix to ${unmatchedCount} 'ghost' faculty missing from the lists.`)
  console.log('🎉 Done!')
}

main().catch(console.error)
