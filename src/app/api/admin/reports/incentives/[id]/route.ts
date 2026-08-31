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
    // Portal rows have id prefixed with "portal_" — strip the prefix and
    // delete from incentive_applications. Legacy rows delete from legacy_incentives.
    if (id.startsWith('portal_')) {
      const realId = id.replace(/^portal_/, '')
      const { error } = await admin
        .from('incentive_applications')
        .delete()
        .eq('id', realId)

      if (error) throw error
    } else {
      const { error } = await admin
        .from('legacy_incentives')
        .delete()
        .eq('id', id)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE incentives error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
