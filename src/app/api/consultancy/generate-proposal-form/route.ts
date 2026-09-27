import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'
import { fillTemplate } from '@/lib/fillDocxTemplate'

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
      requires_ethics_approval
    } = body

    const admin = createAdminClient()
    const { data: faculty } = await admin
      .from('master_faculty')
      .select('name, dept')
      .eq('user_id', user.id)
      .single()

    const pi_name = faculty?.name || ''
    const department = faculty?.dept || ''
    const declaration_date = new Date().toLocaleDateString()

    // The python string building is no longer needed for checkboxes because
    // docxtemplater cannot insert checkboxes, we use XML replacement instead.
    // We just pass the raw booleans to fillDocxTemplate.ts
    const _isConsultancyForm = true;
    const _payment_terms = payment_terms;
    const _involves_ip = involves_ip;
    const _requires_ethics = requires_ethics_approval;

    const data = {
      project_title,
      pi_name,
      department,
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
      payment_terms_schedule, // In case we use {payment_terms_schedule} for the line
      declaration_date,
      _isConsultancyForm,
      _payment_terms,
      _involves_ip,
      _requires_ethics
    }

    const { data: templateData } = await admin
      .from('document_templates')
      .select('file_url')
      .eq('module', 'consultancy')
      .eq('doc_key', 'proposal_form')
      .eq('is_current', true)
      .single()

    if (!templateData?.file_url) {
      throw new Error('Template not found in database')
    }

    const filledDocxBuffer = await fillTemplate(templateData.file_url, data)

    return new NextResponse(filledDocxBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Consultancy_Proposal_Form_${user.id}.docx"`
      }
    })
  } catch (error: any) {
    console.error('Error generating consultancy proposal form:', error)
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}
