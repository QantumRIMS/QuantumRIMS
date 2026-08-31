import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authResult = await verifyToken(token)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = { id: authResult.userId }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('consultancy_applications')
      .select('*')
      .eq('id', params.id)
      .eq('applicant_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const authResult = await verifyToken(token)
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = { id: authResult.userId }

  try {
    const body = await request.json()
    // only allow update if currently rejected
    const admin = createAdminClient()
    const { data: current, error: checkError } = await admin
      .from('consultancy_applications')
      .select('status')
      .eq('id', params.id)
      .eq('applicant_id', user.id)
      .single()
      
    if (checkError || !current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (current.status !== 'rejected') return NextResponse.json({ error: 'Can only edit rejected applications' }, { status: 400 })

    const { error } = await admin
      .from('consultancy_applications')
      .update({
        ...body,
        status: 'pending',
        rejection_remark: null
      })
      .eq('id', params.id)
      .eq('applicant_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
