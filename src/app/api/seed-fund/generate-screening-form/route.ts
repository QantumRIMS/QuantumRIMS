import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken } from '@/lib/verifyAuth'
import { extractToken } from '@/lib/verifyAuth'

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

    const { data: templateData } = await admin
      .from('document_templates')
      .select('file_url')
      .eq('module', 'seed_fund')
      .eq('doc_key', 'initial_screening_form')
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
        'Content-Disposition': `attachment; filename="Screening_Form_${user.id}.docx"`
      }
    })
  } catch (error: any) {
    console.error('Error generating screening form:', error)
    return NextResponse.json({ error: 'Failed to generate document' }, { status: 500 })
  }
}
