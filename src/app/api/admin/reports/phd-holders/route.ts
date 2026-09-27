import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const url = new URL(request.url)
    const dept = url.searchParams.get('dept')
    const year = url.searchParams.get('year') || '2026'
    const phdOnly = url.searchParams.get('phdOnly') === 'true'

    const admin = createAdminClient()
    
    let query = admin
      .from('legacy_phd_holders')
      .select('*')
      .eq('academic_year', year)
      .order('s_no', { ascending: true })

    if (dept && dept !== 'all') {
      query = query.ilike('dept', dept)
    }

    if (phdOnly) {
      query = query.eq('is_phd', true)
    }

    const { data, error } = await query

    if (error) throw error

    // Fetch unique departments for filters (only for the selected year)
    const { data: deptData } = await admin.from('legacy_phd_holders').select('dept').eq('academic_year', year)
    const departments = Array.from(new Set(deptData?.map(d => d.dept).filter(Boolean))).sort()

    // Fetch unique academic years for the dropdown
    const { data: yearData } = await admin.from('legacy_phd_holders').select('academic_year')
    let years = Array.from(new Set(yearData?.map(d => d.academic_year).filter(Boolean))).sort((a, b) => String(b).localeCompare(String(a)))
    
    // Ensure the current year is in the list even if empty
    if (!years.includes(year)) {
      years.push(year)
      years.sort((a, b) => String(b).localeCompare(String(a)))
    }

    return NextResponse.json({ data: data || [], departments, years })
  } catch (error: any) {
    console.error('Fetch error:', error)
    return NextResponse.json({ error: error.message || 'Fetch failed' }, { status: 500 })
  }
}
