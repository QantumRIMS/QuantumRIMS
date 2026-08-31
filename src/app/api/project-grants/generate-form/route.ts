import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import { fillTemplate, convertDocxToPdf } from '@/lib/fillDocxTemplate'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authResult = await verifyToken(token)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = { id: authResult.userId }

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
      additional_resources
    } = body

    const admin = createAdminClient()
    const { data: faculty } = await admin
      .from('master_faculty')
      .select('name, dept')
      .eq('user_id', user.id)
      .single()

    const pi_name = faculty?.name || ''
    const department = faculty?.dept || ''
    const submission_date = new Date().toLocaleDateString('en-IN')

    const data = {
      pi_name,
      department,
      submission_date,
      research_project_title,
      funding_agency,
      project_announcement_details,
      submission_deadline: submission_deadline ? new Date(submission_deadline).toLocaleDateString('en-IN') : '',
      pi_name_designation: pi_name, // Will just use pi_name since designation isn't strictly available, or we could leave it as pi_name
      co_investigators: co_investigators || '',
      collaborating_industry: collaborating_industry || '',
      project_duration_months: project_duration_months || '',
      total_proposed_budget: total_proposed_budget || '',
      external_reviewer_feedback: external_reviewer_feedback || '',
      expected_outcomes_papers: expected_outcomes_papers || '0',
      expected_outcomes_patents: expected_outcomes_patents || '0',
      expected_outcomes_infrastructure: expected_outcomes_infrastructure || '',
      additional_resources: additional_resources || ''
    }

    const templatePath = 'public/templates/project-grants/CFRD_RP_PS_01 - RESEARCH PROJECT PROPOSAL SUBMISSION FORM.docx'
    const filledDocxBuffer = fillTemplate(templatePath, data)
    const pdfBuffer = await convertDocxToPdf(filledDocxBuffer)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Project-Grant-Proposal-Form.pdf"`
      }
    })
  } catch (error: any) {
    console.error('Error generating project grant form PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
