import { NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authResult = await verifyToken(token)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('project_grant_applications')
      .select('*')
      .eq('id', params.id)
      .eq('applicant_id', authResult.userId)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authResult = await verifyToken(token)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    
    const admin = createAdminClient()
    
    // Check ownership and status
    const { data: existing, error: checkError } = await admin
      .from('project_grant_applications')
      .select('status, applicant_id')
      .eq('id', params.id)
      .single()
      
    if (checkError) throw checkError
    if (existing.applicant_id !== authResult.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (existing.status !== 'rejected') return NextResponse.json({ error: 'Can only edit rejected applications' }, { status: 400 })

    const { 
      research_project_title,
      funding_agency,
      project_announcement_details,
      submission_deadline,
      co_investigators,
      collaborating_industry,
      project_duration_months,
      total_proposed_budget,
      external_reviewer_feedback,
      expected_outcomes_papers,
      expected_outcomes_patents,
      expected_outcomes_infrastructure,
      additional_resources,
      proposal_form_url
    } = body

    const { data, error } = await admin.from('project_grant_applications')
      .update({
        research_project_title,
        funding_agency,
        project_announcement_details,
        submission_deadline,
        co_investigators,
        collaborating_industry,
        project_duration_months,
        total_proposed_budget,
        external_reviewer_feedback,
        expected_outcomes_papers,
        expected_outcomes_patents,
        expected_outcomes_infrastructure,
        additional_resources,
        proposal_form_url,
        status: 'pending', // Resets back to pending
        rejection_remark: null // Clear remark
      })
      .eq('id', params.id)
      .eq('applicant_id', authResult.userId)
      .select('id').single()

    if (error) throw error

    return NextResponse.json({ success: true, id: data.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
