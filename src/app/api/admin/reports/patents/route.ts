import { NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import { createAdminClient } from '@/lib/supabase'

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
  const status = searchParams.get('status')

  try {
    let query = admin.from('legacy_patents').select('*')
    if (year && year !== 'all') query = query.eq('academic_year', year)
    if (dept && dept !== 'all') query = query.eq('department', dept)
    if (status && status !== 'all') query = query.ilike('status', `%${status}%`)
    if (startDate) query = query.gte('filed_date', startDate)
    if (endDate) query = query.lte('filed_date', endDate)
    
    // get unique departments for the dropdown
    const { data: allDeptsData } = await admin.from('legacy_patents').select('department')
    let departments: string[] = []
    if (allDeptsData) {
      const depts = new Set(allDeptsData.map(d => d.department).filter(Boolean))
      departments = Array.from(depts)
    }

    const { data, error } = await query
    if (error) throw error
    
    // Sort descending by academic year then filed_date
    const result = (data || []).sort((a: any, b: any) => {
      if (a.academic_year !== b.academic_year) return (b.academic_year || '').localeCompare(a.academic_year || '')
      const da = a.filed_date ? new Date(a.filed_date).getTime() : 0
      const db = b.filed_date ? new Date(b.filed_date).getTime() : 0
      return db - da
    })
    
    return NextResponse.json({ data: result, departments })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
