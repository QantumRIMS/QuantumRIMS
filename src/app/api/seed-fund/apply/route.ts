import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken } from '@/lib/verifyAuth'


export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const admin = createAdminClient()

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authResult = await verifyToken(token)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = { id: authResult.userId }

  try {
    const body = await request.json()
    const {
      title,
      funding_agency,
      announcement_details,
      pi_name_designation,
      co_investigators,
      amount_requested,
      objectives,
      expected_utilization,
      proposed_location,
      duration_months,
      reviewer_feedback,
      expected_outcomes,
      additional_resources,
      collaborating_industry,
      screening_form_url,
      requisition_form_url,
      project_document_url
    } = body

    if (!title || !pi_name_designation || !amount_requested || !objectives || !expected_utilization || !screening_form_url || !requisition_form_url || !project_document_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('seed_fund_applications')
      .insert({
        applicant_id: user.id,
        title,
        funding_agency,
        announcement_details,
        pi_name_designation,
        co_investigators,
        amount_requested,
        objectives,
        expected_utilization,
        proposed_location,
        duration_months: duration_months || null,
        reviewer_feedback,
        expected_outcomes,
        additional_resources,
        collaborating_industry,
        screening_form_url,
        requisition_form_url,
        project_document_url,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
