import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken } from '@/lib/verifyAuth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const admin = createAdminClient()

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fast JWT verify — avoids slow admin.auth.getUser() round-trip
  const authResult = await verifyToken(token)
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = { id: authResult.userId }


  const { data: faculty, error: facultyError } = await admin
    .from('master_faculty')
    .select('name, dept, emp_id')
    .eq('user_id', user.id)
    .single()

  if (facultyError || !faculty) {
    return NextResponse.json(
      { error: `Faculty record not found for this account. Details: ${facultyError?.message || 'Not found'} (User ID: ${user.id})` },
      { status: 403 }
    )
  }

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const doi = (body.doi as string)?.trim()

  if (doi) {
    const { data: existing } = await admin
      .from('submissions')
      .select('id')
      .eq('doi', doi)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'This paper is already recorded (duplicate DOI).' },
        { status: 409 }
      )
    }
  }

  const submissionId = body.id || crypto.randomUUID()

  const { error: insertError } = await admin.from('submissions').insert({
    id: submissionId,
    authors: body.authors,
    title: body.title,
    source_title: body.source_title,
    volume: body.volume || null,
    issue: body.issue || null,
    year: body.year ? parseInt(body.year) : null,
    doi: doi || null,
    scopus_link: body.scopus_link || null,
    doc_type_scopus: body.doc_type_scopus || null,
    doc_type: body.doc_type || null,
    doc_type_report: body.doc_type_report || null,
    isbn_no: body.isbn_no || null,
    issn_no: body.issn_no || null,
    proof_full_paper_url: body.proof_full_paper_url || null,
    proof_scopus_url: body.proof_scopus_url || null,
    proof_published_url: body.proof_published_url || null,
    publication_date: body.publication_date || null,
    faculty_name: faculty.name,
    department: faculty.dept,
    submitted_by: user.id,
  })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: submissionId })
}
