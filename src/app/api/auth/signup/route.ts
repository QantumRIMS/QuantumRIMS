import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { emp_id?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const empId = (body.emp_id ?? '').trim()
  const password = body.password ?? ''

  if (!empId) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: faculty, error: lookupError } = await admin
    .from('master_faculty')
    .select('emp_id, name, dept, is_registered')
    .eq('emp_id', empId)
    .single()

  if (lookupError || !faculty) {
    return NextResponse.json(
      { error: 'Employee ID not found — check with admin.' },
      { status: 404 }
    )
  }

  if (faculty.is_registered) {
    return NextResponse.json(
      { error: 'This Employee ID is already registered. If this isn\'t you, contact admin.' },
      { status: 409 }
    )
  }

  const syntheticEmail = `${empId.toLowerCase()}@staff.research-portal.local`

  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
  })

  if (createError || !authData.user) {
    return NextResponse.json(
      { error: `Account creation failed: ${createError?.message ?? 'unknown error'}` },
      { status: 500 }
    )
  }

  const newUserId = authData.user.id

  const { error: updateError } = await admin
    .from('master_faculty')
    .update({ user_id: newUserId, is_registered: true })
    .eq('emp_id', empId)

  if (updateError) {
    await admin.auth.admin.deleteUser(newUserId)
    return NextResponse.json(
      { error: 'Failed to link account — please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
