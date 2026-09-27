import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken, requireAdmin } from '@/lib/verifyAuth'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/admin/reports/publication-targets/import
 *
 * Accepts a multipart form upload:
 *   file          - xlsx file (required)
 *   academic_year - text, default '2026'
 *   replace       - 'true' to DELETE existing targets for this year first
 *
 * Reads from the "Total Publications - 2026" sheet (or the sheet whose name
 * starts with "Total Publications") — this sheet contains the authoritative
 * per-faculty targets in columns O (SCI), P (Scopus Journal), Q (Scopus Conf).
 *
 * All sheet lookups use .trim() matching to avoid the trailing-space trap
 * confirmed in "Faculty with Zero Publications " (note trailing space).
 *
 * Returns:
 *   { imported: N, skipped: N, unmatched: [names], replaced: boolean }
 *
 * Never silently drops rows — all unmatched names are returned.
 */
export async function POST(request: Request) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = await requireAdmin(auth)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const academic_year = (formData.get('academic_year') as string | null)?.trim() || '2026'
    const replace = formData.get('replace') === 'true'

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    if (!file.name.match(/\.(xlsx|xls)$/i)) return NextResponse.json({ error: 'Only Excel files (.xlsx/.xls) are accepted' }, { status: 400 })
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as any)

    // Find the "Total Publications" sheet using .trim() to avoid whitespace traps
    const totalSheet = workbook.worksheets.find(
      ws => ws.name.trim().toLowerCase().startsWith('total publications')
    )
    if (!totalSheet) {
      const sheetNames = workbook.worksheets.map(ws => JSON.stringify(ws.name))
      return NextResponse.json({
        error: `Could not find a "Total Publications" sheet. Available sheets: ${sheetNames.join(', ')}`
      }, { status: 400 })
    }

    console.log(`[TargetImport] Using sheet: ${JSON.stringify(totalSheet.name)} for academic_year=${academic_year}`)

    // Load all master_faculty names for matching
    const admin = createAdminClient()
    const { data: allFaculty, error: mfError } = await admin
      .from('master_faculty')
      .select('emp_id, name, dept')

    if (mfError) throw new Error(`Failed to load master_faculty: ${mfError.message}`)

    // Build normalized name -> faculty map
    const facultyByName = new Map<string, { emp_id: string; name: string; dept: string }>()
    for (const f of allFaculty ?? []) {
      if (f.name) facultyByName.set(f.name.trim().toLowerCase(), f)
    }

    // Parse sheet rows
    // Row 1 = header row in "Total Publications" sheet
    // Col B (2) = Name, Col C (3) = Dept, Col O (15) = SCI target, Col P (16) = Journal, Col Q (17) = Conf
    const toImport: Array<{
      emp_id: string
      academic_year: string
      sci_target: number
      scopus_journal_target: number
      scopus_conference_target: number
      set_by: string
    }> = []
    const unmatched: string[] = []
    let skipped = 0

    for (let r = 2; r <= totalSheet.rowCount; r++) {
      const row = totalSheet.getRow(r)
      const nameCell = row.getCell(2).value
      const name = typeof nameCell === 'string' ? nameCell.trim() : ''
      if (!name || name.toLowerCase() === 'name of the faculty') {
        skipped++
        continue
      }

      const getNum = (colIdx: number): number => {
        const v = row.getCell(colIdx).value
        if (typeof v === 'number') return Math.max(0, Math.round(v))
        if (v && typeof v === 'object' && 'result' in v && typeof (v as any).result === 'number') return Math.max(0, Math.round((v as any).result))
        return 0
      }

      const sci = getNum(15)
      const journal = getNum(16)
      const conf = getNum(17)

      // Skip rows with all-zero targets (likely blank/footer rows)
      if (sci === 0 && journal === 0 && conf === 0) {
        skipped++
        continue
      }

      const normalized = name.toLowerCase()
      const faculty = facultyByName.get(normalized)

      if (!faculty) {
        unmatched.push(name)
        continue
      }

      toImport.push({
        emp_id: faculty.emp_id,
        academic_year,
        sci_target: sci,
        scopus_journal_target: journal,
        scopus_conference_target: conf,
        set_by: auth.id,
      })
    }

    console.log(`[TargetImport] Parsed: ${toImport.length} to import, ${skipped} skipped, ${unmatched.length} unmatched`)

    // Optionally replace existing targets for this year
    if (replace && toImport.length > 0) {
      const { error: delError } = await admin
        .from('faculty_publication_targets')
        .delete()
        .eq('academic_year', academic_year)
      if (delError) throw new Error(`Delete failed: ${delError.message}`)
      console.log(`[TargetImport] Deleted existing targets for academic_year=${academic_year}`)
    }

    // Upsert in batches of 200
    let imported = 0
    const batchSize = 200
    for (let i = 0; i < toImport.length; i += batchSize) {
      const batch = toImport.slice(i, i + batchSize)
      const { error: upsertError } = await admin
        .from('faculty_publication_targets')
        .upsert(batch, { onConflict: 'emp_id,academic_year' })
      if (upsertError) throw new Error(`Upsert failed at batch ${i}: ${upsertError.message}`)
      imported += batch.length
    }

    return NextResponse.json({
      success: true,
      academic_year,
      imported,
      skipped,
      unmatched_count: unmatched.length,
      unmatched, // Full list — never silently dropped
      replaced: replace,
      sheet_used: totalSheet.name,
    })
  } catch (err: any) {
    console.error('[TargetImport] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
