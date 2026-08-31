import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken } from '@/lib/verifyAuth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = createAdminClient()
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const authResult = await verifyToken(token)
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = { id: authResult.userId }

  // 1. Verify the submission belongs to the user and is rejected
  const { data: existingSub, error: fetchError } = await admin
    .from('submissions')
    .select('id, submitted_by, status')
    .eq('id', params.id)
    .single()

  if (fetchError || !existingSub) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  if (existingSub.submitted_by !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (existingSub.status !== 'rejected') {
    return NextResponse.json({ error: 'Only rejected submissions can be edited' }, { status: 400 })
  }

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const doi = (body.doi as string)?.trim()

  if (doi) {
    const { data: duplicate } = await admin
      .from('submissions')
      .select('id')
      .eq('doi', doi)
      .neq('id', params.id)
      .maybeSingle()

    if (duplicate) {
      return NextResponse.json(
        { error: 'This DOI is already recorded on another paper.' },
        { status: 409 }
      )
    }
  }

  // Preserve existing proof URLs if new ones aren't provided in the payload
  const updateData: any = {
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
    publication_date: body.publication_date || null,
    status: 'pending',
    rejection_remark: null,
    reviewed_at: null,
  }

  if (body.proof_full_paper_url !== undefined) updateData.proof_full_paper_url = body.proof_full_paper_url
  if (body.proof_scopus_url !== undefined) updateData.proof_scopus_url = body.proof_scopus_url
  if (body.proof_published_url !== undefined) updateData.proof_published_url = body.proof_published_url

  const { error: updateError } = await admin
    .from('submissions')
    .update(updateData)
    .eq('id', params.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
