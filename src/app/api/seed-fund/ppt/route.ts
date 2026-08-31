import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'

export async function POST(req: Request) {
  const supabaseAdmin = createAdminClient()
  try {
    const token = extractToken(req)
    if (!token) throw new Error('Unauthorized')
    const authResult = await verifyToken(token)
    if (!authResult) throw new Error('Unauthorized')
    const user = { id: authResult.userId }
    const { application_id, ppt_file_url } = await req.json()

    if (!application_id || !ppt_file_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify application belongs to caller and is approved
    const { data: application, error: appError } = await supabaseAdmin
      .from('seed_fund_applications')
      .select('id, status')
      .eq('id', application_id)
      .eq('applicant_id', user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found or unauthorized' }, { status: 404 })
    }

    if (application.status !== 'approved') {
      return NextResponse.json({ error: 'Application must be approved before submitting presentation' }, { status: 403 })
    }

    // Insert ppt submission
    // Using supabaseAdmin here to bypass RLS for ease, but we verified ownership above.
    // Actually, RLS allows staff to insert if application_id is valid, but using Admin ensures it succeeds from API layer.
    const { data, error } = await supabaseAdmin
      .from('seed_fund_ppt_submissions')
      .insert({
        application_id,
        applicant_id: user.id,
        ppt_file_url,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A presentation submission already exists for this application' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
