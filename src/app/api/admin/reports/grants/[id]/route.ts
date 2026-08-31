import { NextResponse } from 'next/server'
import { verifyToken, extractToken, requireAdmin } from '@/lib/verifyAuth'
import { createAdminClient } from '@/lib/supabase'
import { deleteCloudinaryFiles } from '@/lib/cloudinaryDelete'

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

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')

  const id = params.id
  const admin = createAdminClient()

  try {
    if (source === 'live') {
      // 1. Fetch live row to get Cloudinary URLs
      const { data: grant, error: fetchError } = await admin
        .from('project_grant_applications')
        .select('proposal_form_url')
        .eq('id', id)
        .maybeSingle()

      if (fetchError) throw fetchError

      // 2. Delete from project_grant_applications
      const { error: deleteError } = await admin
        .from('project_grant_applications')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // 3. Delete files from Cloudinary
      if (grant && grant.proposal_form_url) {
        await deleteCloudinaryFiles([grant.proposal_form_url])
      }
    } else {
      // Delete from research_grants (legacy table)
      const { error: deleteLegacyError } = await admin
        .from('research_grants')
        .delete()
        .eq('id', id)

      if (deleteLegacyError) throw deleteLegacyError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE grants error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
