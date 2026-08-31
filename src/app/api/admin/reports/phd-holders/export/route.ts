import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const admin = createAdminClient()
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dept = searchParams.get('dept')

  try {
    let allRawData: any[] = []
    let hasMore = true
    let page = 0
    const pageSize = 1000

    while (hasMore) {
      let query = admin.from('legacy_phd_holders').select('*').range(page * pageSize, (page + 1) * pageSize - 1)
      
      if (dept && dept !== 'all') {
        query = query.ilike('dept', dept)
      }

      const { data: pageData, error } = await query
      if (error) throw error

      if (pageData && pageData.length > 0) {
        allRawData = [...allRawData, ...pageData]
        if (pageData.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      } else {
        hasMore = false
      }
    }

    const rawData = allRawData

    let data = [...(rawData || [])].sort((a, b) => {
      return (a.s_no || 0) - (b.s_no || 0)
    })

    const workbook = new ExcelJS.Workbook()
    const ws = workbook.addWorksheet('PhD Holders')

    const headers = ['S.No', 'Dept', 'Name of the Faculty']
    
    const headerRow = ws.addRow(headers)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF000000' }, size: 11 }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD1D5DB' },
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    })
    headerRow.height = 30

    const colWidths = [10, 20, 40]
    colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w })

    ;(data || []).forEach(row => {
      ws.addRow([
        row.s_no || '', row.dept || '', row.name || ''
      ])
    })

    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="PhD_Holders_Export_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
