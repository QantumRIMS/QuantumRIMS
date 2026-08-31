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

  try {
    let query = admin
      .from('legacy_seed_fund_grants')
      .select('*')
      .order('academic_year', { ascending: false })

    if (year && year !== 'all') query = query.eq('academic_year', year)
    if (dept && dept !== 'all') query = query.eq('dept', dept)

    const { data, error } = await query
    if (error) throw error

    // Build departments list from unfiltered data (always all years/depts)
    const { data: allRows } = await admin
      .from('legacy_seed_fund_grants')
      .select('dept')
    const departments = [...new Set((allRows || []).map((r: any) => r.dept).filter(Boolean))].sort() as string[]

    return NextResponse.json({ data: data || [], departments })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
