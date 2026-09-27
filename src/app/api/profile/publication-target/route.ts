import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getFacultyAchievement } from '@/lib/facultyTargetStats'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/profile/publication-target
 *   ?academic_year=2026   (optional, default '2026')
 *
 * Staff-facing endpoint — requires a valid session cookie (not admin token).
 * Returns the logged-in faculty's own publication target + live achievement.
 * Server side ALWAYS resolves emp_id from the session user_id — the client
 * never supplies an emp_id, eliminating any possibility of data leakage.
 *
 * Returns:
 *   { target: FacultyTarget | null, achievement: FacultyAchievement | null,
 *     no_target: boolean }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const academic_year = searchParams.get('academic_year') || '2026'

  // Use the public Supabase client to verify the session from the cookie
  // (staff routes use cookie-based auth, not bearer tokens)
  const { createClient } = await import('@supabase/supabase-js')
  const { cookies } = await import('next/headers')

  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Cookie: cookieStore.toString(),
      },
    },
  })

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    // Resolve emp_id from user_id — server-side, never from client input
    const admin = createAdminClient()
    const { data: mfRow, error: mfError } = await admin
      .from('master_faculty')
      .select('emp_id, name, dept')
      .eq('user_id', userId)
      .maybeSingle()

    if (mfError) throw new Error(mfError.message)

    if (!mfRow) {
      // User exists in auth but has no master_faculty record yet (signup not complete)
      return NextResponse.json({ target: null, achievement: null, no_target: true, reason: 'no_faculty_record' })
    }

    // Fetch their target for this year
    const { data: targetRow, error: targetError } = await admin
      .from('faculty_publication_targets')
      .select('sci_target, scopus_journal_target, scopus_conference_target')
      .eq('emp_id', mfRow.emp_id)
      .eq('academic_year', academic_year)
      .maybeSingle()

    if (targetError) throw new Error(targetError.message)

    if (!targetRow) {
      return NextResponse.json({
        target: null,
        achievement: null,
        no_target: true,
        emp_id: mfRow.emp_id,
        name: mfRow.name,
        dept: mfRow.dept,
        academic_year,
      })
    }

    const total_target = targetRow.sci_target + targetRow.scopus_journal_target + targetRow.scopus_conference_target

    // Compute live achievement via shared function
    const achievement = await getFacultyAchievement(mfRow.emp_id, academic_year)

    return NextResponse.json({
      target: {
        emp_id: mfRow.emp_id,
        name: mfRow.name,
        dept: mfRow.dept,
        academic_year,
        sci_target: targetRow.sci_target,
        scopus_journal_target: targetRow.scopus_journal_target,
        scopus_conference_target: targetRow.scopus_conference_target,
        total_target,
      },
      achievement,
      no_target: false,
      met_target: achievement.total_achieved >= total_target && total_target > 0,
    })
  } catch (err: any) {
    console.error('[profile/publication-target] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
