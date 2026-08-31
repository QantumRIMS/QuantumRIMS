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
      funding_agency,
      announcement_details,
      pi_name_designation,
      co_investigators
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
      funding_agency,
      announcement_details,
      pi_name_designation,
      co_investigators
    }

    const templatePath = 'public/templates/CFRD_IRSF_01 - RESEARCH INITIAL REQUEST SCREENING FORM.docx'
    const filledDocxBuffer = fillTemplate(templatePath, data)
    const pdfBuffer = await convertDocxToPdf(filledDocxBuffer)

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Screening-Form.pdf"`
      }
    })
  } catch (error: any) {
    console.error('Error generating screening form PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
