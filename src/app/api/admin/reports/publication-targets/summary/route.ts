import { NextResponse } from 'next/server'
import { verifyToken, extractToken, requireAdmin } from '@/lib/verifyAuth'
import { getTargetCompletionSummary } from '@/lib/facultyTargetStats'

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

  try {
    const summary = await getTargetCompletionSummary(academic_year)
    return NextResponse.json({ ...summary, academic_year })
  } catch (err: any) {
    console.error('[publication-targets/summary] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
