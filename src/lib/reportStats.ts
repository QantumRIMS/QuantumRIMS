import { SupabaseClient } from '@supabase/supabase-js'

export async function getReportsOverviewStats(admin: SupabaseClient) {
  // Kick off all queries concurrently
  const manualStatsPromise = admin.from('report_manual_stats').select('*').eq('id', 1).maybeSingle()
  const scopusPubsPromise = admin.from('submissions').select('*', { count: 'exact' }).eq('status', 'approved').limit(1)
  const patentsPromise = admin.from('incentive_applications').select('*', { count: 'exact' }).eq('category', 'patent').eq('status', 'approved').limit(1)
  const legacyPubsPromise = admin.from('legacy_publications').select('*', { count: 'exact' }).limit(1)
  const legacyPatentsPromise = admin.from('legacy_patents').select('*', { count: 'exact' }).limit(1)
  
  const phdCountPromise = admin.from('master_faculty').select('*', { count: 'exact' }).eq('type', 'Doctorate').limit(1)
  const totalFacultyPromise = admin.from('master_faculty').select('*', { count: 'exact' }).limit(1)
  const legacySupervisorsPromise = admin.from('legacy_research_supervisors').select('*', { count: 'exact' }).limit(1)
  const legacyScholarsPromise = admin.from('legacy_research_scholars').select('*', { count: 'exact' }).limit(1)
  
  const aggregatesPromise = admin.rpc('get_report_stats_aggregates')

  const [
    { data: manualStats },
    { count: scopus_publications_count },
    { count: patents_published_count },
    legacyPubsRes,
    legacyPatentsRes,
    { count: phdCount },
    { count: totalFaculty },
    { count: legacySupervisorsCount },
    { count: legacyScholarsCount },
    { data: aggregatesData, error: aggregatesError }
  ] = await Promise.all([
    manualStatsPromise,
    scopusPubsPromise,
    patentsPromise,
    legacyPubsPromise,
    legacyPatentsPromise,
    phdCountPromise,
    totalFacultyPromise,
    legacySupervisorsPromise,
    legacyScholarsPromise,
    aggregatesPromise
  ])

  const legacyPubs = legacyPubsRes?.count || 0
  const legacyPatents = legacyPatentsRes?.count || 0
  console.log('DEBUG: scopus_publications_count=', scopus_publications_count)
  console.log('DEBUG: legacyPubs=', legacyPubs)
  console.log('DEBUG: legacyPubsRes=', legacyPubsRes)

  if (aggregatesError) {
    console.error("Error fetching aggregated report stats:", aggregatesError)
  }

  const aggregates = aggregatesData || {}

  const incentives_total = (Number(aggregates.live_incentives_total) || 0) + (Number(aggregates.legacy_incentives_total) || 0)
  const seed_fund_grants_total = (Number(aggregates.live_seed_total) || 0) + (Number(aggregates.legacy_seed_total) || 0)
  const project_grants_total = (Number(aggregates.live_grants_total) || 0) + (Number(aggregates.legacy_grants_total) || 0)
  const project_grants_count = (Number(aggregates.live_grants_count) || 0) + (Number(aggregates.legacy_grants_count) || 0)
  const consultancy_project_total = Number(aggregates.consultancy_total) || 0

  const faculty_phd_percent = totalFaculty ? Math.round(((phdCount || 0) / totalFaculty) * 100) : 0

  return {
    manualStats: manualStats || { 
      au_research_supervisors_count: 24, 
      research_funds_total: 5400000,
      consultancy_project_total: 1250000,
      au_research_scholars_count: 120,
      female_faculty_percent: 55
    },
    liveStats: {
      scopus_publications_count: (scopus_publications_count || 0) + (legacyPubs || 0),
      patents_published_count: (patents_published_count || 0) + (legacyPatents || 0),
      seed_fund_grants_total,
      incentives_total,
      faculty_phd_percent,
      project_grants_total,
      project_grants_count,
      au_research_supervisors_count: legacySupervisorsCount || 0,
      au_research_scholars_count: legacyScholarsCount || 0,
      consultancy_project_total
    }
  }
}
