import { NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import { createAdminClient } from '@/lib/supabase'

export const revalidate = 0
export const fetchCache = 'force-no-store'

export async function GET(request: Request) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status') || 'pending'
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profile_edit_requests')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[profile-edit-requests GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch faculty name/dept separately using emp_ids
  const empIds = [...new Set((data || []).map((d: any) => d.emp_id).filter(Boolean))]
  let facultyMap: Record<string, { name: string; dept: string }> = {}

  if (empIds.length > 0) {
    const { data: facultyRows } = await admin
      .from('master_faculty')
      .select('emp_id, name, dept')
      .in('emp_id', empIds)

    if (facultyRows) {
      for (const f of facultyRows) {
        facultyMap[f.emp_id] = { name: f.name, dept: f.dept }
      }
    }
  }

  const formatted = (data || []).map((d: any) => ({
    ...d,
    faculty_name: facultyMap[d.emp_id]?.name ?? d.previous_name ?? '—',
    department: facultyMap[d.emp_id]?.dept ?? d.previous_dept ?? '—',
  }))

  return NextResponse.json({ data: formatted })
}
