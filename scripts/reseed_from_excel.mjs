/**
 * reseed_from_excel.mjs
 * 
 * Full re-seed of master_faculty + faculty_publication_targets from the official
 * "Faculty - Publication Status Report - 2026.xlsx" Excel file.
 *
 * What it does:
 *  1. Reads all valid faculty rows from the Excel (315 rows, skipping blanks/RS/RF duplicates)
 *  2. Normalizes dept names to a consistent set
 *  3. For each faculty: upserts into master_faculty (by name+dept match or creates new)
 *  4. Upserts 2026 targets AND static achieved counts into faculty_publication_targets
 *
 * Rows with #N/A in achieved cols → treated as achieved=0 (data not available)
 *
 * Run: node scripts/reseed_from_excel.mjs
 */

import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import ws from 'ws'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
)

// ── Dept normalisation map ──────────────────────────────────────────────────
const DEPT_MAP = {
  'AIDS':           'AIDS',
  'AIML':           'AIML',
  'CCE':            'CCE',
  'CSBS':           'CSBS',
  'CSE':            'CSE',
  'Cyber Security': 'Cyber Security',
  'ECE':            'ECE',
  'EEE':            'EEE',
  'IT':             'IT',
  'MECH':           'Mech',   // normalise MECH -> Mech
  'Mech':           'Mech',
  'S & H (Phy)':   'S & H (Phy)',
  'S & H (Maths)': 'S & H (Maths)',
  'S & H (Che)':   'S & H (Che)',
  'S&H (Che)':     'S & H (Che)',  // normalise spacing variant
  'S & H (Eng)':   'S & H (Eng)',
}

// Rows to skip
const SKIP_DEPT = new Set(['', 'RS', 'RF - S & H (Physics)', 'RF - S & H (Chemistry)'])

// ── Generate emp_id from name + dept ───────────────────────────────────────
function makeEmpId(name, dept, index) {
  // Build a deterministic ID from dept prefix + name initials + index
  const deptCode = dept.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4)
  const nameParts = name.replace(/^(Dr\.|Mr\.|Ms\.|Prof\.)\s*/i, '').trim().split(/\s+/)
  const initials = nameParts.map(p => p[0]?.toUpperCase() || '').join('').slice(0, 4)
  return `SECE${deptCode}${initials}${String(index).padStart(3, '0')}`
}

function safeNum(val) {
  if (typeof val === 'number') return val
  if (typeof val === 'string' && val !== '#N/A') return parseInt(val, 10) || 0
  return 0 // #N/A or empty → 0
}

async function main() {
  console.log('📖 Reading Excel...')
  const wb = XLSX.readFile('public/templates/Faculty - Publication Status Report - 2026.xlsx')
  const ws2 = wb.Sheets[wb.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json(ws2, { defval: '' })

  // Filter and normalise rows
  const rows = rawRows
    .filter(r => !SKIP_DEPT.has(r['Dept']))
    .filter(r => {
      const dept = DEPT_MAP[r['Dept']]
      if (!dept) {
        console.warn(`⚠ Unknown dept "${r['Dept']}" for "${r['Name of the Faculty']}" — skipping`)
        return false
      }
      return true
    })
    .map(r => ({
      name: (r['Name of the Faculty'] || '').trim(),
      dept: DEPT_MAP[r['Dept']],
      designation: (r['Designation in 2026'] || 'Faculty').trim() || 'Faculty',
      type: (r['Type'] || 'Doctorate').trim() || 'Doctorate',
      sci_achieved: safeNum(r['SCI - 2026']),
      scopus_journal_achieved: safeNum(r['Scopus/WoS Journals - 2026']),
      scopus_conference_achieved: safeNum(r['Scopus/WoS Conference/Book Chapter/Others - 2026']),
      sci_target: safeNum(r['Target SCI - 2026']),
      scopus_journal_target: safeNum(r['Target Scopus/WoS Journals - 2026']),
      scopus_conference_target: safeNum(r['Target Scopus/WoS Conference/Book Chapter/Others - 2026']),
      na_row: r['SCI - 2026'] === '#N/A',
    }))
    .filter(r => r.name)

  console.log(`✅ ${rows.length} valid faculty rows loaded from Excel`)
  const naCount = rows.filter(r => r.na_row).length
  console.log(`   (${naCount} have #N/A achieved — will store achieved=0 for those)\n`)

  // ── Load existing master_faculty ──────────────────────────────────────────
  console.log('📋 Loading existing master_faculty...')
  const { data: existingMF, error: mfErr } = await supabase
    .from('master_faculty')
    .select('emp_id, name, dept, user_id')
  
  if (mfErr) { console.error('❌ Error loading master_faculty:', mfErr.message); process.exit(1) }

  // Build lookup: normalised name → faculty record
  const existingByName = new Map(existingMF.map(f => [f.name.trim().toLowerCase(), f]))
  console.log(`   Found ${existingMF.length} existing faculty in DB\n`)

  // ── Process each Excel row ────────────────────────────────────────────────
  const toInsertMF = []      // new master_faculty rows
  const toUpdateMF = []      // existing rows that need dept normalisation
  const targetUpserts = []   // faculty_publication_targets rows

  let matchedExisting = 0
  let newFacultyCount = 0

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const nameKey = r.name.toLowerCase()
    const existing = existingByName.get(nameKey)

    let emp_id

    if (existing) {
      emp_id = existing.emp_id
      matchedExisting++
      // Normalise dept if needed
      if (existing.dept !== r.dept) {
        toUpdateMF.push({ emp_id, dept: r.dept })
      }
    } else {
      // New faculty — generate emp_id
      emp_id = makeEmpId(r.name, r.dept, newFacultyCount + 1)
      newFacultyCount++
      toInsertMF.push({
        emp_id,
        name: r.name,
        dept: r.dept,
        designation: r.designation,
        type: r.type,
        is_registered: false,
        // user_id left null — they don't have a portal account yet
      })
    }

    targetUpserts.push({
      emp_id,
      academic_year: '2026',
      sci_target: r.sci_target,
      scopus_journal_target: r.scopus_journal_target,
      scopus_conference_target: r.scopus_conference_target,
      sci_achieved_static: r.sci_achieved,
      scopus_journal_achieved_static: r.scopus_journal_achieved,
      scopus_conference_achieved_static: r.scopus_conference_achieved,
      updated_at: new Date().toISOString(),
    })
  }

  console.log(`📊 Summary:`)
  console.log(`   Matched existing faculty: ${matchedExisting}`)
  console.log(`   New faculty to insert:    ${newFacultyCount}`)
  console.log(`   Dept updates needed:      ${toUpdateMF.length}`)
  console.log(`   Target upserts:           ${targetUpserts.length}\n`)

  // ── Apply changes ─────────────────────────────────────────────────────────

  // 1. Insert new master_faculty
  if (toInsertMF.length > 0) {
    console.log(`⬆ Inserting ${toInsertMF.length} new faculty into master_faculty...`)
    const BATCH = 50
    for (let i = 0; i < toInsertMF.length; i += BATCH) {
      const batch = toInsertMF.slice(i, i + BATCH)
      const { error } = await supabase.from('master_faculty').insert(batch)
      if (error) {
        console.error(`❌ Insert error (batch ${i}):`, error.message)
        process.exit(1)
      }
    }
    console.log(`✅ Inserted ${toInsertMF.length} new faculty\n`)
  }

  // 2. Update dept for mismatched existing faculty
  if (toUpdateMF.length > 0) {
    console.log(`🔄 Normalising dept for ${toUpdateMF.length} existing faculty...`)
    for (const u of toUpdateMF) {
      const { error } = await supabase.from('master_faculty').update({ dept: u.dept }).eq('emp_id', u.emp_id)
      if (error) console.warn(`⚠ Dept update failed for ${u.emp_id}:`, error.message)
    }
    console.log(`✅ Dept normalisation done\n`)
  }

  // 3. Upsert faculty_publication_targets (with static achieved)
  console.log(`⬆ Upserting ${targetUpserts.length} target rows...`)
  const BATCH = 100
  for (let i = 0; i < targetUpserts.length; i += BATCH) {
    const batch = targetUpserts.slice(i, i + BATCH)
    const { error } = await supabase
      .from('faculty_publication_targets')
      .upsert(batch, { onConflict: 'emp_id,academic_year' })
    if (error) {
      console.error(`❌ Target upsert error (batch ${i}):`, error.message)
      process.exit(1)
    }
    console.log(`   Upserted batch ${i}–${i + batch.length}`)
  }
  console.log(`✅ All targets upserted\n`)

  // ── Final count ───────────────────────────────────────────────────────────
  const { count: finalMF } = await supabase.from('master_faculty').select('*', { count: 'exact', head: true })
  const { count: finalTargets } = await supabase.from('faculty_publication_targets').select('*', { count: 'exact', head: true }).eq('academic_year', '2026')
  console.log(`🎉 Done!`)
  console.log(`   master_faculty total:               ${finalMF}`)
  console.log(`   faculty_publication_targets (2026): ${finalTargets}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
