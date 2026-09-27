import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken, requireAdmin } from '@/lib/verifyAuth'
import { getFacultyTargetsWithAchievement } from '@/lib/facultyTargetStats'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = await requireAdmin(auth)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const academic_year = searchParams.get('academic_year') || '2026'
  const dept = searchParams.get('dept') || 'all'

  try {
    // We use the central logic which fetches everything, joins achievements, etc.
    let data = await getFacultyTargetsWithAchievement(academic_year, { includeNoTarget: true })

    if (dept && dept !== 'all') {
      const lowerDept = dept.toLowerCase()
      data = data.filter(d => d.dept.toLowerCase().includes(lowerDept))
    }

    // Department summary with 5-band classification
    const deptMap = new Map<string, { total: number; met: number; total_target: number; total_achieved: number }>()
    for (const f of data) {
      const d = deptMap.get(f.dept) ?? { total: 0, met: 0, total_target: 0, total_achieved: 0 }
      d.total++
      if (f.met_target) d.met++
      d.total_target += f.total_target
      d.total_achieved += f.achievement.total_achieved
      deptMap.set(f.dept, d)
    }

    const deptSummary = [...deptMap.entries()]
      .map(([d, s]) => {
        const pct_achieved = s.total_target > 0
          ? Math.round((s.total_achieved / s.total_target) * 100)
          : 0
        const pct_met = s.total > 0 ? Math.round((s.met / s.total) * 100) : 0
        const band =
          pct_achieved <= 20 ? 'Poor' :
          pct_achieved <= 40 ? 'Unsatisfied' :
          pct_achieved <= 60 ? 'Average' :
          pct_achieved <= 80 ? 'Satisfied' : 'Good'
        return { dept: d, total: s.total, met: s.met, pct_met, total_target: s.total_target, total_achieved: s.total_achieved, pct_achieved, band }
      })
      .sort((a, b) => b.pct_achieved - a.pct_achieved)

    const deptList = [...new Set(data.map(r => r.dept).filter(Boolean))].sort()
    
    // Summary
    const withTarget = data.filter(f => f.total_target > 0)
    const met = withTarget.filter(f => f.met_target).length
    const pct = withTarget.length > 0 ? Math.round((met / withTarget.length) * 100) : 0

    return NextResponse.json({
      data,
      dept_summary: deptSummary,
      departments: deptList,
      summary: { percent_met: pct, count_met: met, total_with_target: withTarget.length },
      academic_year,
    })
  } catch (err: any) {
    console.error('[publication-targets GET] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const isAdmin = await requireAdmin(auth)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })

  try {
    const admin = createAdminClient()
    const body = await request.json()
    const academic_year = body.academic_year

    if (!academic_year) {
      return NextResponse.json({ error: 'academic_year is required' }, { status: 400 })
    }

    let updates = []
    if (body.updates && Array.isArray(body.updates)) {
      updates = body.updates
    } else {
      updates = [body]
    }

    const upserts = updates.map((u: { emp_id: string; sci_target?: number; scopus_target?: number; conference_target?: number }) => ({
      emp_id: u.emp_id,
      academic_year,
      sci_target: u.sci_target || 0,
      scopus_journal_target: u.scopus_target || 0, // Frontend uses scopus_target
      scopus_conference_target: u.conference_target || 0,
      set_by: auth.id,
      updated_at: new Date().toISOString()
    }))

    const { error } = await admin
      .from('faculty_publication_targets')
      .upsert(upserts, { onConflict: 'emp_id,academic_year' })

    if (error) throw error

    return NextResponse.json({ success: true, count: upserts.length })
  } catch (err: any) {
    console.error('[publication-targets PUT] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
