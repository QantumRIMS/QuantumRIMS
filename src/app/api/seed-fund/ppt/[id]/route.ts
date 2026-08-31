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
    const { ppt_file_url } = await req.json()

    if (!ppt_file_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify ownership and rejected status
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('seed_fund_ppt_submissions')
      .select('id, status')
      .eq('id', params.id)
      .eq('applicant_id', user.id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Submission not found or unauthorized' }, { status: 404 })
    }

    if (existing.status !== 'rejected') {
      return NextResponse.json({ error: 'Can only resubmit rejected presentations' }, { status: 400 })
    }

    // Update ppt submission
    const { data, error } = await supabaseAdmin
      .from('seed_fund_ppt_submissions')
      .update({
        ppt_file_url,
        status: 'pending',
        rejection_remark: null // clear remark on resubmit
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
