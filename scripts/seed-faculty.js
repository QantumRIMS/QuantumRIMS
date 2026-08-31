#!/usr/bin/env node
/**
 * seed-faculty.js
 * ---------------
 * Reads the "Name of the Faculty" sheet from the portal Excel file and
 * upserts all rows into the Supabase master_faculty table.
 *
 * Usage:
 *   node scripts/seed-faculty.js path/to/file.xlsx [--dry-run]
 *
 * Columns expected in the "Name of the Faculty" sheet:
 *   col1=S.No | col2=Emp.ID | col3=Dept. | col4=Name of the Faculty | col5=Designation | col6=Type
 */

const ExcelJS = require('exceljs')
const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Load .env.local manually (no dotenv package needed)
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) process.env[key] = val
  }
}

const filePath = process.argv[2]
const isDryRun = process.argv.includes('--dry-run')

if (!filePath) {
  console.error('❌  Usage: node scripts/seed-faculty.js path/to/faculty.xlsx [--dry-run]')
  process.exit(1)
}

if (!isDryRun && (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('YOUR_PROJECT'))) {
  console.error('❌  Missing real Supabase credentials in .env.local — add your URL and service role key first.')
  process.exit(1)
}

async function main() {
  console.log(`📖  Reading: ${filePath}`)
  if (isDryRun) console.log('🧪  DRY RUN — will not write to database\n')

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)

  // Find "Name of the Faculty" sheet
  let ws = wb.worksheets.find(s => s.name.toLowerCase().includes('faculty') || s.name.toLowerCase().includes('name'))
  if (!ws) {
    // Fallback: try sheet 2 (index 1)
    ws = wb.worksheets[1] || wb.worksheets[0]
    console.warn(`⚠️  Could not find "Name of the Faculty" sheet — using sheet: "${ws?.name}"`)
  } else {
    console.log(`✅  Using sheet: "${ws.name}" (${ws.rowCount} rows)`)
  }

  if (!ws) {
    console.error('❌  No worksheets found in the file.')
    process.exit(1)
  }

  // Read header row to find column positions
  const headerRow = ws.getRow(1)
  const headers = {}
  headerRow.eachCell((cell, colNum) => {
    const val = String(cell.value && typeof cell.value === 'object' && 'richText' in cell.value
      ? cell.value.richText.map(r => r.text).join('')
      : cell.value || ''
    ).trim()
    headers[val] = colNum
    headers[val.toLowerCase()] = colNum
  })

  console.log(`📋  Detected columns:`, Object.keys(headers).filter(k => !k.match(/^[a-z]/) || k === k).slice(0, 10).join(', '))

  // Map column names (robust to variations)
  const colFor = (...names) => {
    for (const n of names) {
      if (headers[n] !== undefined) return headers[n]
      if (headers[n.toLowerCase()] !== undefined) return headers[n.toLowerCase()]
    }
    return null
  }

  const colEmpId = colFor('Emp.ID', 'EmpID', 'Emp ID', 'emp_id', 'Employee ID', 'EMP ID') || 2
  const colDept  = colFor('Dept.', 'Dept', 'Department', 'dept', 'DEPT') || 3
  const colName  = colFor('Name of the Faculty', 'Name', 'Faculty Name', 'name') || 4
  const colDes   = colFor('Designation', 'designation') || 5
  const colType  = colFor('Type', 'Staff Type', 'type') || 6

  console.log(`   emp_id→col${colEmpId}, dept→col${colDept}, name→col${colName}, designation→col${colDes}, type→col${colType}\n`)

  const records = []
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return // skip header

    const getCellStr = (colNum) => {
      const cell = row.getCell(colNum)
      if (!cell || cell.value === null || cell.value === undefined) return ''
      if (typeof cell.value === 'object' && 'richText' in cell.value) {
        return cell.value.richText.map(r => r.text).join('').trim()
      }
      if (typeof cell.value === 'object' && 'result' in cell.value) {
        return String(cell.value.result || '').trim()
      }
      return String(cell.value).trim()
    }

    const emp_id = getCellStr(colEmpId)
    const dept   = getCellStr(colDept)
    const name   = getCellStr(colName)
    const designation = getCellStr(colDes)
    const type   = getCellStr(colType)

    if (!emp_id || !name) return // skip blank rows
    records.push({ emp_id, dept, name, designation, type })
  })

  console.log(`✅  Parsed ${records.length} valid faculty records.`)

  // Preview first 5
  console.log('\n📝  Preview (first 5 rows):')
  records.slice(0, 5).forEach((r, i) => {
    console.log(`   ${i + 1}. [${r.emp_id}] ${r.name} | ${r.dept} | ${r.designation} | ${r.type}`)
  })

  if (records.length === 0) {
    console.warn('\n⚠️  No records to insert. Check the sheet structure above.')
    process.exit(0)
  }

  if (isDryRun) {
    console.log(`\n🧪  Dry run complete. ${records.length} rows would be upserted.`)
    console.log('    Run without --dry-run to actually write to Supabase.')
    return
  }

  // Deduplicate records by emp_id
  const uniqueRecordsMap = new Map()
  for (const r of records) {
    uniqueRecordsMap.set(r.emp_id, r)
  }
  const uniqueRecords = Array.from(uniqueRecordsMap.values())
  console.log(`🧹  Deduplicated: ${uniqueRecords.length} unique records (removed ${records.length - uniqueRecords.length} duplicates).`)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const CHUNK = 100
  let inserted = 0, failed = 0
  console.log(`\n⬆️   Upserting to Supabase...`)

  for (let i = 0; i < uniqueRecords.length; i += CHUNK) {
    const chunk = uniqueRecords.slice(i, i + CHUNK)
    
    const response = await fetch(`${supabaseUrl}/rest/v1/master_faculty?on_conflict=emp_id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(chunk)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`   ❌ Error on rows ${i + 1}–${i + CHUNK}: ${errorText}`)
      failed += chunk.length
    } else {
      inserted += chunk.length
      process.stdout.write(`   ✔ ${inserted}/${records.length} rows done\r`)
    }
  }

  console.log(`\n\n🎉  Done! ${inserted} inserted/updated, ${failed} failed.`)
  if (inserted > 0) {
    console.log(`\n✅  master_faculty now has ${inserted} staff records.`)
    console.log('   Faculty autofill will work for all these Employee IDs.')
  }
}

main().catch(e => {
  console.error('\n💥  Fatal:', e.message)
  process.exit(1)
})
