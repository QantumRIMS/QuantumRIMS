import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken } from '@/lib/verifyAuth'
import { calculateIncentive } from '@/lib/incentive'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const admin = createAdminClient()
  
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = authHeader.split(' ')[1]
  
  const authResult = await verifyToken(token)
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = { id: authResult.userId }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { submission_id, category } = body

  if (!submission_id || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Validate required fields per category
  if (category === 'conference' && !body.h_index) {
    return NextResponse.json({ error: 'H-Index is required for Conference applications' }, { status: 400 })
  }
  if (category === 'patent' && (body.patent_type === 'application' || body.patent_type === 'grant')) {
    if (!body.patent_forms_confirmed) {
      return NextResponse.json({ error: 'Patent forms must be confirmed for this application type' }, { status: 400 })
    }
  }

  // Verify submission belongs to caller and is approved
  const { data: sub, error: subError } = await admin
    .from('submissions')
    .select('submitted_by, status')
    .eq('id', submission_id)
    .single()

  if (subError || !sub) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }
  
  if (sub.submitted_by !== user.id || sub.status !== 'approved') {
    return NextResponse.json({ error: 'Forbidden. Submission must belong to you and be approved.' }, { status: 403 })
  }

  const calculationParams = {
    authorCount: body.author_count,
    authorPosition: body.author_position,
    impactFactor: body.impact_factor,
    journalQuartile: body.journal_quartile,
    hIndex: body.h_index,
    publisherTier: body.publisher_tier,
    bookType: body.book_type,
    patentType: body.patent_type,
    citationCount: body.citation_count,
    selfCitationCount: body.self_citation_count
  }

  const { finalAmount } = calculateIncentive(category, calculationParams)

  // Check if an existing application is there and rejected (upsert pattern)
  const { data: existing } = await admin
    .from('incentive_applications')
    .select('id, status')
    .eq('submission_id', submission_id)
    .single()

  const payload = {
    submission_id,
    applicant_id: user.id,
    category,
    author_count: body.author_count ? Number(body.author_count) : null,
    author_position: body.author_position ? Number(body.author_position) : null,
    impact_factor: body.impact_factor ? Number(body.impact_factor) : null,
    journal_quartile: body.journal_quartile || null,
    h_index: body.h_index ? Number(body.h_index) : null,
    publisher_tier: body.publisher_tier || null,
    book_type: body.book_type || null,
    patent_type: body.patent_type || null,
    patent_forms_confirmed: body.patent_forms_confirmed || false,
    citation_count: body.citation_count ? Number(body.citation_count) : null,
    self_citation_count: body.self_citation_count ? Number(body.self_citation_count) : 0,
    calculated_amount: finalAmount,
    status: 'pending',
    rejection_remark: null,
    reviewed_at: null
  }

  if (existing) {
    if (existing.status !== 'rejected') {
      return NextResponse.json({ error: 'Application already exists and is not rejected.' }, { status: 400 })
    }
    const { error: updateError } = await admin
      .from('incentive_applications')
      .update(payload)
      .eq('id', existing.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  } else {
    const { error: insertError } = await admin
      .from('incentive_applications')
      .insert(payload)

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, amount: finalAmount })
}
