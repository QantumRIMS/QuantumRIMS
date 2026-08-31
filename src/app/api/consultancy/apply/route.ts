import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'

export async function POST(request: Request) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authResult = await verifyToken(token)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = { id: authResult.userId }

  try {
    const body = await request.json()
    const {
      project_title,
      pi_email,
      pi_mobile,
      client_name,
      client_city,
      client_state,
      client_pincode,
      contact_person_name,
      contact_designation,
      contact_email,
      contact_phone,
      objectives,
      nature_of_work,
      scope_expected_outcomes,
      deliverables,
      project_timeline,
      consultancy_fee,
      payment_terms,
      payment_terms_schedule,
      involves_ip,
      requires_ethics_approval,
      proposal_form_url,
      mou_url,
      work_monitoring_url,
      payment_receipt_url,
      work_expense_report_url,
      expenditure_documentation_checklist_url,
      audit_statement_url,
      agreement_closure_url,
      revenue_sharing_url,
      closer_checklist_url
    } = body

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('consultancy_applications')
      .insert([
        {
          applicant_id: user.id,
          project_title,
          pi_email,
          pi_mobile,
          client_name,
          client_city,
          client_state,
          client_pincode,
          contact_person_name,
          contact_designation,
          contact_email,
          contact_phone,
          objectives,
          nature_of_work,
          scope_expected_outcomes,
          deliverables,
          project_timeline,
          consultancy_fee,
          payment_terms,
          payment_terms_schedule,
          involves_ip,
          requires_ethics_approval,
          proposal_form_url,
          mou_url,
          work_monitoring_url,
          payment_receipt_url,
          work_expense_report_url,
          expenditure_documentation_checklist_url,
          audit_statement_url,
          agreement_closure_url,
          revenue_sharing_url,
          closer_checklist_url,
          status: 'pending'
        }
      ])
      .select('id')
      .single()

    if (error) {
      console.error('Error inserting consultancy application:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
