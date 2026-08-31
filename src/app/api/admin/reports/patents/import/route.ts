import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import { parseSpreadsheetRows } from '@/lib/importSpreadsheet'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PATENTS_COLUMN_MAP = {
  department: 'dep',
  application_number: 'application',
  status: 'status of patent',
  inventors: 'inventor',
  title: 'title',
  applicants: 'applicant',
  filed_date: 'patent filed date',
  published_or_granted_date: 'published date',
  publication_or_grant_number: 'publication number',
  assignee: 'assignee',
  proof_link: 'proof',
  academic_year: 'academic year'
};

export async function POST(request: Request) {
  // const token = extractToken(request)
  // if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // const auth = await verifyToken(token)
  // if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const mode = formData.get('mode') as string || 'append'
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json({ error: 'Only Excel files are allowed' }, { status: 400 })
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as any)

    let allRows: any[] = []
    let totalSkipped = 0
    let totalDeleted = 0
    const sheetStats: any[] = []
    const errors: any[] = []

    console.log(`[Patent Import] Starting import. Mode: ${mode}, File: ${file.name}, Size: ${file.size}`)

    for (const sheet of workbook.worksheets) {
      if (!/^\d{4}/.test(sheet.name)) {
        console.log(`[Patent Import] Skipping sheet: ${sheet.name} (does not match year pattern)`)
        sheetStats.push({ name: sheet.name, skipped: true, error: null })
        continue
      }
      
      console.log(`[Patent Import] Parsing sheet: ${sheet.name}...`)
      try {
        const { rows, skipped } = await parseSpreadsheetRows(buffer, PATENTS_COLUMN_MAP, sheet.name)
        
        // Fallback academic year if missing but we can deduce from sheet name
        const match = sheet.name.match(/^(\d{4})/)
        const deducedYear = match ? `${parseInt(match[1]) - 1}-${match[1]}` : '2023-2024'
        
        rows.forEach(r => {
          if (!r.academic_year) r.academic_year = deducedYear
        })
        
        allRows.push(...rows)
        totalSkipped += skipped
        console.log(`[Patent Import] Sheet ${sheet.name}: Found/Parsed ${rows.length} rows, Skipped ${skipped} empty/invalid rows.`)
        sheetStats.push({ name: sheet.name, rowsFound: rows.length + skipped, rowsParsed: rows.length, rowsSkipped: skipped, skipped: false, error: null })
      } catch (sheetErr: any) {
        console.error(`[Patent Import] Error parsing sheet ${sheet.name}:`, sheetErr)
        errors.push({ sheet: sheet.name, error: sheetErr.message || String(sheetErr) })
        sheetStats.push({ name: sheet.name, skipped: false, error: sheetErr.message || String(sheetErr) })
      }
    }

    if (allRows.length === 0) {
      return NextResponse.json({ error: 'No valid data found in the spreadsheet (no matching sheets)' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (mode === 'replace') {
      console.log(`[Patent Import] Mode is REPLACE. Initiating deletion of existing legacy_patents...`)
      const { data: delData, error: delError, count: delCount } = await admin.from('legacy_patents').delete().not('id', 'is', null).select()
      if (delError) {
        console.error(`[Patent Import] Delete failed! Exact error:`, delError)
        return NextResponse.json({ 
          error: 'Failed to delete existing data before replacement.', 
          details: delError 
        }, { status: 500 })
      }
      totalDeleted = delData?.length || 0
      console.log(`[Patent Import] Deletion successful. Removed ${totalDeleted} records.`)
    }

    // Dedup check: fetch existing application numbers if appending
    const appNosInFile = allRows.map(r => r.application_number).filter(Boolean)
    let existingAppNos = new Set()
    
    if (mode !== 'replace' && appNosInFile.length > 0) {
      const { data: existing } = await admin
        .from('legacy_patents')
        .select('application_number')
        .in('application_number', appNosInFile)
      if (existing) {
        existingAppNos = new Set(existing.map(e => e.application_number))
      }
    }

    const newRows = []
    let deduppedCount = 0
    let fileAppNos = new Set()

    for (const row of allRows) {
      if (row.application_number) {
        if (existingAppNos.has(row.application_number) || fileAppNos.has(row.application_number)) {
          deduppedCount++
          continue
        }
        fileAppNos.add(row.application_number)
      }
      newRows.push(row)
    }

    console.log(`[Patent Import] Total accumulated rows: ${allRows.length}. After cross-sheet deduping: ${newRows.length} (Deduped: ${deduppedCount})`)

    if (newRows.length > 0) {
      console.log(`[Patent Import] Initiating insert of ${newRows.length} records into legacy_patents...`)
      const { error: insError } = await admin.from('legacy_patents').insert(newRows)
      if (insError) {
        console.error(`[Patent Import] Insert failed! Exact error:`, insError)
        return NextResponse.json({ 
          error: 'Database insert failed', 
          details: insError 
        }, { status: 500 })
      }
      console.log(`[Patent Import] Insert successful.`)
    } else {
      console.log(`[Patent Import] No new records to insert.`)
    }

    console.log(`[Patent Import] Finished completely. Imported: ${newRows.length}, Skipped: ${totalSkipped + deduppedCount}, Deleted: ${totalDeleted}`)
    
    return NextResponse.json({ 
      imported: newRows.length, 
      skipped: totalSkipped + deduppedCount,
      deleted: totalDeleted,
      mode: mode,
      sheets: sheetStats,
      errors: errors 
    })

  } catch (error: any) {
    console.error('[Patent Import] Top-level import error:', error)
    return NextResponse.json({ 
      error: error.message || 'Import failed',
      details: error 
    }, { status: 500 })
  }
}
