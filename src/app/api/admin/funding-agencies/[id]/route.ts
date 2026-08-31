import { NextResponse } from 'next/server'
import { verifyToken, extractToken, requireAdmin } from '@/lib/verifyAuth'
import { createAdminClient } from '@/lib/supabase'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = extractToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const authResult = await verifyToken(token)
    if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await requireAdmin(authResult)
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { section, agency_name, website, contact_details } = body

    if (!section || !agency_name || !contact_details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('funding_agencies')
      .update({
        section,
        agency_name,
        website: website || null,
        contact_details
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating funding agency:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const token = extractToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const authResult = await verifyToken(token)
    if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isAdmin = await requireAdmin(authResult)
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const supabase = createAdminClient()

    const { error } = await supabase
      .from('funding_agencies')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting funding agency:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
