import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken } from '@/lib/verifyAuth'
import { extractToken } from '@/lib/verifyAuth'

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
      title,
      amount_requested,
      objectives,
      expected_utilization,
      pi_name_designation,
      co_investigators,
      proposed_location,
      duration_months,
      reviewer_feedback,
      expected_outcomes,
      additional_resources,
      collaborating_industry
    } = body

    const admin = createAdminClient()
    const { data: faculty } = await admin
      .from('master_faculty')
      .select('name, dept')
      .eq('user_id', user.id)
      .single()

    const faculty_name = faculty?.name || ''
    const department = faculty?.dept || ''
    const date = new Date().toLocaleDateString()

    const data = {
      faculty_name,
      department,
      date,
      title,
      amount_requested: amount_requested ? amount_requested.toString() : '',
      objectives,
      expected_utilization,
      pi_name_designation,
      co_investigators,
      proposed_location,
      duration_months: duration_months ? duration_months.toString() : '',
      reviewer_feedback,
      expected_outcomes,
      additional_resources,
      collaborating_industry
    }

    const templatePath = 'public/templates/CFRD_SM _RF_01- RESEARCH SEED MONEY REQUISITION FORM Ver 2.0.docx'
    const filledDocxBuffer = fillTemplate(templatePath, data)
    const pdfBuffer = await convertDocxToPdf(filledDocxBuffer)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Requisition-Form.pdf"`
      }
    })
  } catch (error: any) {
    console.error('Error generating requisition form PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
