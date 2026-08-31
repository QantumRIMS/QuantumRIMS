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

  // Restrict to admins only
  const isAdmin = await requireAdmin(auth)
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const source = searchParams.get('source')
  const cascade = searchParams.get('cascade') === 'true'

  const id = params.id
  const admin = createAdminClient()

  try {
    if (source === 'live') {
      // 1. Check for linked incentive applications
      const { data: linkedIncentives, error: checkError } = await admin
        .from('incentive_applications')
        .select('id, category')
        .eq('submission_id', id)

      if (checkError) throw checkError

      if (linkedIncentives && linkedIncentives.length > 0) {
        if (!cascade) {
          return NextResponse.json({
            error: 'linked_records',
            message: `This submission has ${linkedIncentives.length} linked incentive application(s). Delete those first, or confirm cascade delete.`,
            count: linkedIncentives.length
          }, { status: 409 })
        } else {
          // Delete linked incentive applications
          const { error: deleteIncError } = await admin
            .from('incentive_applications')
            .delete()
            .eq('submission_id', id)
          if (deleteIncError) throw deleteIncError
        }
      }

      // 2. Fetch the submission details to get Cloudinary URLs
      const { data: submission, error: fetchSubError } = await admin
        .from('submissions')
        .select('proof_full_paper_url, proof_scopus_url, proof_published_url')
        .eq('id', id)
        .maybeSingle()

      if (fetchSubError) throw fetchSubError

      // 3. Delete from submissions table
      const { error: deleteSubError } = await admin
        .from('submissions')
        .delete()
        .eq('id', id)

      if (deleteSubError) throw deleteSubError

      // 4. Delete files from Cloudinary
      if (submission) {
        await deleteCloudinaryFiles([
          submission.proof_full_paper_url,
          submission.proof_scopus_url,
          submission.proof_published_url
        ])
      }
    } else {
      // Delete from legacy_publications
      const { error: deleteLegacyError } = await admin
        .from('legacy_publications')
        .delete()
        .eq('id', id)

      if (deleteLegacyError) throw deleteLegacyError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE publications error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
