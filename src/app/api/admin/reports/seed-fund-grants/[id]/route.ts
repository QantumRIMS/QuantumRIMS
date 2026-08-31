import { NextResponse } from 'next/server'
import { verifyToken, extractToken, requireAdmin } from '@/lib/verifyAuth'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const isAdmin = await requireAdmin(auth)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = params.id
  const admin = createAdminClient()

  try {
    const { error } = await admin
      .from('legacy_seed_fund_grants')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE seed fund error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
