import { NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const token = extractToken(request)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const auth = await verifyToken(token)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Log what we got for debugging
    console.log('[profile/edit-request] auth:', { id: auth.id, email: auth.email })

    const body = await request.json()
    const adminClient = createAdminClient()

    const { data: faculty, error: facErr } = await adminClient
      .from('master_faculty')
      .select('emp_id, type, name, designation, dept')
      .eq('user_id', auth.id)
      .maybeSingle()

    if (facErr || !faculty) {
      console.error('[profile/edit-request] faculty lookup error:', facErr, '| user_id:', auth.id)
      return NextResponse.json({ error: 'Faculty record not found' }, { status: 404 })
    }

    // Only set the ones that actually changed
    // Always include previous_type to satisfy the NOT NULL constraint on the column
    const insertPayload: any = {
      applicant_id: auth.id,
      emp_id: faculty.emp_id,
      status: 'pending',
      previous_type: faculty.type   // satisfies NOT NULL inherited from phd_completion_requests
    }

    if (body.requested_name && body.requested_name !== faculty.name) {
      insertPayload.requested_name = body.requested_name
      insertPayload.previous_name = faculty.name
    }
    if (body.requested_designation && body.requested_designation !== faculty.designation) {
      insertPayload.requested_designation = body.requested_designation
      insertPayload.previous_designation = faculty.designation
    }
    if (body.requested_dept && body.requested_dept !== faculty.dept) {
      insertPayload.requested_dept = body.requested_dept
      insertPayload.previous_dept = faculty.dept
    }
    if (body.requested_type && body.requested_type !== faculty.type) {
      insertPayload.requested_type = body.requested_type
      insertPayload.previous_type = faculty.type
    }

    // Ensure at least one field is changing
    if (Object.keys(insertPayload).length <= 4) {
      return NextResponse.json({ error: 'No changes detected' }, { status: 400 })
    }

    // Check if a pending request exists
    const { data: existingPending } = await adminClient
      .from('profile_edit_requests')
      .select('id')
      .eq('applicant_id', auth.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingPending) {
      return NextResponse.json({ error: 'A request is already pending approval' }, { status: 400 })
    }

    // Insert pending request
    const { data, error } = await adminClient
      .from('profile_edit_requests')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Profile edit request error:', error)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}
