import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const admin = createAdminClient()
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year')
  const dept = searchParams.get('dept')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    let query = admin.from('legacy_consultancy').select('*')
    if (year && year !== 'all') query = query.eq('academic_year', year)
    if (dept && dept !== 'all') query = query.eq('department', dept)
    if (startDate) query = query.gte('project_date', startDate)
    if (endDate) query = query.lte('project_date', endDate)

    // Fetch all rows (paginate past the 1000-row default limit)
    let allData: any[] = []
    let from = 0
    const step = 1000
    while (true) {
      const { data, error } = await query.range(from, from + step - 1)
      if (error) throw error
      if (data && data.length > 0) {
        allData.push(...data)
        if (data.length < step) break
        from += step
      } else {
        break
      }
    }

    // Get unique departments for the dropdown
    const { data: allDeptsData } = await admin.from('legacy_consultancy').select('department')
    let departments: string[] = []
    if (allDeptsData) {
      const depts = new Set(allDeptsData.map(d => d.department).filter(Boolean))
      departments = Array.from(depts).sort()
    }

    // Sort descending by academic year then project_date
    const result = allData.sort((a: any, b: any) => {
      if (a.academic_year !== b.academic_year) return (b.academic_year || '').localeCompare(a.academic_year || '')
      const da = a.project_date ? new Date(a.project_date).getTime() : 0
      const db = b.project_date ? new Date(b.project_date).getTime() : 0
      return db - da
    })

    return NextResponse.json({ data: result, departments })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
