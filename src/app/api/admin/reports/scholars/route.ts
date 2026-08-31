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

  try {
    let query = admin.from('legacy_research_scholars').select('*')
    if (year && year !== 'all') query = query.eq('academic_year', year)
    if (dept && dept !== 'all') query = query.eq('research_centre', dept)
    if (startDate) query = query.gte('year_of_registration', startDate)
    if (endDate) query = query.lte('year_of_registration', endDate)
    
    // get unique research centres for the dropdown
    const { data: allDeptsData } = await admin.from('legacy_research_scholars').select('research_centre')
    let departments: string[] = []
    if (allDeptsData) {
      const depts = new Set(allDeptsData.map(d => d.research_centre).filter(Boolean))
      departments = Array.from(depts)
    }

    const { data, error } = await query
    if (error) throw error
    
    // Sort descending by academic year then year_of_registration
    const result = (data || []).sort((a: any, b: any) => {
      if (a.academic_year !== b.academic_year) return (b.academic_year || '').localeCompare(a.academic_year || '')
      const da = a.year_of_registration ? new Date(a.year_of_registration).getTime() : 0
      const db = b.year_of_registration ? new Date(b.year_of_registration).getTime() : 0
      return db - da
    })
    
    return NextResponse.json({ data: result, departments })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
