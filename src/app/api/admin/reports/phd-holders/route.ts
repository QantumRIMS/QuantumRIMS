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

    const admin = createAdminClient()
    
    let query = admin
      .from('legacy_phd_holders')
      .select('*')
      .order('s_no', { ascending: true })

    if (dept && dept !== 'all') {
      query = query.ilike('dept', dept)
    }

    const { data, error } = await query

    if (error) throw error

    // Fetch unique departments for filters
    const { data: deptData } = await admin
      .from('legacy_phd_holders')
      .select('dept')
    
    let departments: string[] = []
    if (deptData) {
      departments = Array.from(new Set(deptData.map(d => d.dept).filter(Boolean))) as string[]
      departments.sort((a, b) => a.localeCompare(b))
    }

    return NextResponse.json({ data: data || [], departments })
  } catch (error: any) {
    console.error('Fetch error:', error)
    return NextResponse.json({ error: error.message || 'Fetch failed' }, { status: 500 })
  }
}
