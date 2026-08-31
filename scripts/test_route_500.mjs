import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws from 'ws'
dotenv.config({ path: './.env.local' })

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws }
})

async function check() {
  try {
    const year = 'all'
    const dept = 'all'

    // 1. Fetch legacy grants
    let legacyQuery = admin.from('research_grants').select('*')
    if (year && year !== 'all') legacyQuery = legacyQuery.eq('academic_year', year)
    if (dept && dept !== 'all') legacyQuery = legacyQuery.eq('department', dept)
    
    const { data: legacyData, error: legacyError } = await legacyQuery
    if (legacyError) throw legacyError

    // 2. Fetch live approved project grants
    let liveQuery = admin
      .from('project_grant_applications')
      .select('id, research_project_title, funding_agency, co_investigators, project_duration_months, total_proposed_budget, created_at, applicant_id')
      .eq('status', 'approved')

    const { data: liveDataRaw, error: liveError } = await liveQuery
    if (liveError) throw liveError

    console.log("Success! Legacy count:", legacyData?.length, "Live count:", liveDataRaw?.length)
  } catch(e) {
    console.error("ERROR:", e)
  }
}
check()
