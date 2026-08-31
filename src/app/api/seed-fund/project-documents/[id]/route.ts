import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabaseAdmin = createAdminClient()
  try {
    const token = extractToken(req)
    if (!token) throw new Error('Unauthorized')
    const authResult = await verifyToken(token)
    if (!authResult) throw new Error('Unauthorized')
    const user = { id: authResult.userId }

    const body = await req.json()
    const { release_request_url, deliverable_report_url, additional_release_request_url, completion_report_url, certificate_declaration_url, utilization_certificate_url, closer_checklist_url, incomplete_closure_url, seed_fund_closure_url } = body

    const requiredFields = ['release_request_url', 'deliverable_report_url', 'additional_release_request_url', 'completion_report_url', 'certificate_declaration_url', 'utilization_certificate_url', 'closer_checklist_url', 'incomplete_closure_url', 'seed_fund_closure_url']
    const missing = requiredFields.filter(f => !body[f])
    
    if (missing.length > 0) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('seed_fund_project_documents')
      .update({
        release_request_url,
        deliverable_report_url,
        additional_release_request_url,
        completion_report_url,
        certificate_declaration_url,
        utilization_certificate_url,
        closer_checklist_url,
        incomplete_closure_url,
        seed_fund_closure_url,
        status: 'pending',
        rejection_remark: null
      })
      .eq('id', params.id)
      .eq('applicant_id', user.id)
      .eq('status', 'rejected')
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found or not rejected' }, { status: 404 })

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
