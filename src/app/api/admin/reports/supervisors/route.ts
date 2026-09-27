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

  try {
    let query = admin.from('legacy_research_supervisors').select('*')
    if (year && year !== 'all') query = query.eq('academic_year', year)
    if (dept && dept !== 'all') query = query.eq('department', dept)
    
    // get unique departments and years for the dropdown via RPC
    const { data: allDeptsData } = await admin.rpc('get_distinct_column_values', { p_table_name: 'legacy_research_supervisors', p_column_name: 'department' })
    const { data: allYearsData } = await admin.rpc('get_distinct_column_values', { p_table_name: 'legacy_research_supervisors', p_column_name: 'academic_year' })
    
    const departments = allDeptsData ? allDeptsData.map((d: any) => d.val).filter(Boolean).sort() : []
    const years = allYearsData ? allYearsData.map((y: any) => y.val).filter(Boolean).sort().reverse() : []

    // Pagination for legacy_research_supervisors
    let allData: any[] = []
    let from = 0
    const step = 1000
    while (true) {
      let queryPage = admin.from('legacy_research_supervisors').select('*').range(from, from + step - 1)
      if (year && year !== 'all') queryPage = queryPage.eq('academic_year', year)
      if (dept && dept !== 'all') queryPage = queryPage.eq('department', dept)
      
      const { data, error } = await queryPage
      if (error) throw error
      if (data && data.length > 0) {
        allData.push(...data)
        if (data.length < step) break
        from += step
      } else {
        break
      }
    }
    
    // Sort descending by academic year
    const result = allData.sort((a: any, b: any) => {
      if (a.academic_year !== b.academic_year) return (b.academic_year || '').localeCompare(a.academic_year || '')
      return 0
    })
    
    return NextResponse.json({ data: result, departments, years })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
