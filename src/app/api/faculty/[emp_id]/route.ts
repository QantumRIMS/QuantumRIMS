import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: { emp_id: string } }
) {
  const empId = params.emp_id?.trim()
  if (!empId) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('master_faculty')
    .select('name, dept')
    .eq('emp_id', empId)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: 'Employee ID not found — check with admin' },
      { status: 404 }
    )
  }

  return NextResponse.json(data)
}
