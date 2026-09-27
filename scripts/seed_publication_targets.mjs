import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws_lib from 'ws'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

dotenv.config({ path: '.env.local' })

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false }, realtime: { transport: ws_lib } }
)

const EXCEL_FILE = 'public/templates/Total_Publications_2026_Only_Required_Columns.xlsx'
const ACADEMIC_YEAR = '2026'

// Names to skip (tutorial duplicates, research scholars, visiting)
const SKIP_SUFFIXES = [' (T)', ' (t)']
const SKIP_DEPTS = ['RS', 'RF - S & H (Physics)', 'RF - S & H (Chemistry)']
const SKIP_NAMES = ['Visiting Professor']

function toInt(val) {
  const n = parseInt(String(val).trim(), 10)
  return isNaN(n) ? 0 : n
}

function toBigInt(val) {
  const n = parseFloat(String(val).trim())
  return isNaN(n) ? 0 : Math.round(n)
}

async function main() {
  console.log('📖 Reading Excel file...')
  const wb = XLSX.readFile(EXCEL_FILE)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
  console.log(`   Found ${rows.length} rows in Excel.`)

  // Load all faculty from master_faculty for name→emp_id lookup
  console.log('📋 Loading master faculty from DB...')
  const { data: faculty, error: facErr } = await admin.from('master_faculty').select('emp_id, name, dept')
  if (facErr) { console.error('❌ Failed to load faculty:', facErr); process.exit(1) }
  console.log(`   Loaded ${faculty.length} faculty members.`)

  // Build name lookup map (lowercase)
  const nameMap = new Map()
  for (const f of faculty) {
    if (f.name) nameMap.set(f.name.trim().toLowerCase(), f.emp_id)
  }

  let updates = []
  let skipped = []
  let unmatched = []

  for (const row of rows) {
    const rawName = String(row['Name of the Faculty'] || '').trim()
    const dept = String(row['Dept'] || '').trim()

    // Skip tutorial duplicates
    if (SKIP_SUFFIXES.some(s => rawName.endsWith(s))) {
      skipped.push(`${rawName} (tutorial duplicate)`)
      continue
    }
    // Skip research scholar departments
    if (SKIP_DEPTS.includes(dept) || dept.startsWith('RS') || dept.startsWith('RF')) {
      skipped.push(`${rawName} (dept: ${dept})`)
      continue
    }
    // Skip specific names
    if (SKIP_NAMES.includes(rawName) || rawName === '') {
      skipped.push(`${rawName} (skipped by rule)`)
      continue
    }

    const emp_id = nameMap.get(rawName.toLowerCase())
    if (!emp_id) {
      unmatched.push({ name: rawName, dept })
      continue
    }

    updates.push({
      emp_id,
      academic_year: ACADEMIC_YEAR,
      sci_target:               toInt(row['Target SCI - 2026']),
      scopus_journal_target:    toInt(row['Target Scopus/WoS Journals - 2026']),
      scopus_conference_target: toInt(row['Target Scopus/WoS Conference/Book Chapter/Others - 2026']),
      designation:              String(row['Designation in 2026'] || '').trim() || null,
      faculty_type:             String(row['Type'] || '').trim() || null,
      student_publication_target: toInt(row['Student Publication Target']),
      utility_patent_target:    toInt(row['Utility Patent Target']),
      design_patent_target:     toInt(row['Design Patent Target']),
      copyright_target:         toInt(row['Copyright Target']),
      funding_target:           toBigInt(row['Funding Target']),
      consultancy_target:       toBigInt(row['Consultancy Target']),
    })
  }

  console.log(`\n✅ Matched: ${updates.length} faculty`)
  console.log(`⏭️  Skipped: ${skipped.length} rows`)
  console.log(`❓ Unmatched: ${unmatched.length} rows`)
  if (unmatched.length > 0) {
    console.log('   Unmatched names:')
    unmatched.forEach(u => console.log(`     - "${u.name}" (${u.dept})`))
  }

  if (updates.length === 0) {
    console.log('Nothing to upsert.')
    return
  }

  console.log(`\n⬆️  Upserting ${updates.length} target records for academic year ${ACADEMIC_YEAR}...`)

  // Upsert in batches of 100
  const BATCH = 100
  let totalUpserted = 0
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH)
    const { error } = await admin.from('faculty_publication_targets').upsert(batch, {
      onConflict: 'emp_id,academic_year',
      ignoreDuplicates: false
    })
    if (error) {
      console.error(`❌ Batch ${Math.floor(i / BATCH) + 1} failed:`, error.message)
    } else {
      totalUpserted += batch.length
      process.stdout.write(`\r   Upserted ${totalUpserted}/${updates.length}...`)
    }
  }

  console.log(`\n🎉 Done! Successfully mapped ${totalUpserted} faculty targets for ${ACADEMIC_YEAR}.`)
}

main().catch(console.error)
