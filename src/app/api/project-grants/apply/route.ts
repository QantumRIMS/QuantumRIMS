import { NextResponse } from 'next/server'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import { createAdminClient } from '@/lib/supabase'

export async function POST(request: Request) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authResult = await verifyToken(token)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
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

    if (!research_project_title || !proposal_form_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = createAdminClient()
    
    // Create new application
    const { data, error } = await admin.from('project_grant_applications').insert({
      applicant_id: authResult.userId,
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
      status: 'pending'
    }).select('id').single()

    if (error) throw error

    return NextResponse.json({ success: true, id: data.id }, { status: 201 })
  } catch (error: any) {
    console.error('Error applying for project grant:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
