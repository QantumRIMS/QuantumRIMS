import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import { parseSpreadsheetRows } from '@/lib/importSpreadsheet'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const PHD_COLUMN_MAP = {
  s_no: 'S.No',
  dept: 'Dept',
  name: 'Name of the Faculty'
}

export async function POST(request: Request) {
  try {
    const token = extractToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const auth = await verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    if (!file.name.match(/\.(xlsx|xls)$/i)) return NextResponse.json({ error: 'Only Excel files are allowed' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows } = await parseSpreadsheetRows(buffer, PHD_COLUMN_MAP)

    if (rows.length === 0) return NextResponse.json({ error: 'No valid data found in the spreadsheet' }, { status: 400 })

    const admin = createAdminClient()
    
    // Clean and validate rows
    const newRows = rows.map(r => ({
      s_no: parseInt(r.s_no, 10) || null,
      dept: (r.dept || '').trim(),
      name: (r.name || '').trim()
    })).filter(r => r.name) // name is required

    if (newRows.length === 0) return NextResponse.json({ error: 'No valid names found in the spreadsheet' }, { status: 400 })

    // Truncate and replace
    const { error: deleteError } = await admin.from('legacy_phd_holders').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (deleteError) throw deleteError

    const { error: insertError } = await admin.from('legacy_phd_holders').insert(newRows)
    if (insertError) throw insertError

    return NextResponse.json({ 
      replaced: newRows.length,
      errors: [] 
    })

  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 })
  }
}
