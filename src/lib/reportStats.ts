import { SupabaseClient } from '@supabase/supabase-js'

export async function getReportsOverviewStats(admin: SupabaseClient) {
  const fetchAll = async (queryFactory: () => any) => {
    let allData: any[] = []
    let from = 0
    const step = 1000
    while (true) {
      const { data, error } = await queryFactory().range(from, from + step - 1)
      if (error) return { error }
      if (data && data.length > 0) {
        allData.push(...data)
        if (data.length < step) break
        from += step
      } else {
        break
      }
    }
    return { data: allData }
  }

  // Kick off all queries concurrently
  const manualStatsPromise = admin.from('report_manual_stats').select('*').eq('id', 1).maybeSingle()
  const scopusPubsPromise = admin.from('submissions').select('*', { count: 'exact' }).eq('status', 'approved').limit(1)
  const patentsPromise = admin.from('incentive_applications').select('*', { count: 'exact' }).eq('category', 'patent').eq('status', 'approved').limit(1)
  const legacyPubsPromise = admin.from('legacy_publications').select('*', { count: 'exact' }).limit(1)
  const legacyPatentsPromise = admin.from('legacy_patents').select('*', { count: 'exact' }).limit(1)
  const incentivePromise = fetchAll(() => admin.from('incentive_applications').select('calculated_amount').eq('status', 'approved'))
  
  // Use pagination for legacy_incentives because it exceeds 1000 rows
  const legacyIncentivePromise = fetchAll(() => admin.from('legacy_incentives').select('received_amount'))
  
  // Potentially others will exceed 1000 rows in the future, so paginate them too
  const legacySeedPromise = fetchAll(() => admin.from('legacy_seed_fund_grants').select('amount_sanctioned'))
  const liveSeedPromise = fetchAll(() => admin.from('seed_fund_applications').select('amount_requested').eq('status', 'approved'))
  const legacyGrantsPromise = fetchAll(() => admin.from('research_grants').select('grant_amount'))
  const liveGrantsPromise = fetchAll(() => admin.from('project_grant_applications').select('total_proposed_budget').eq('status', 'approved'))
  
  const phdCountPromise = admin.from('master_faculty').select('*', { count: 'exact' }).eq('type', 'Doctorate').limit(1)
  const totalFacultyPromise = admin.from('master_faculty').select('*', { count: 'exact' }).limit(1)
  const legacySupervisorsPromise = admin.from('legacy_research_supervisors').select('*', { count: 'exact' }).limit(1)
  const legacyScholarsPromise = admin.from('legacy_research_scholars').select('*', { count: 'exact' }).limit(1)
  
  const legacyConsultancyPromise = fetchAll(() => admin.from('legacy_consultancy').select('amount'))

  const [
    { data: manualStats },
    { count: scopus_publications_count },
    { count: patents_published_count },
    legacyPubsRes,
    legacyPatentsRes,
    { data: incentiveData },
    { data: legacyIncentiveData },
    { data: legacySeedFund },
    { data: liveSeedFund },
    { data: legacyGrants },
    liveGrantsRes,
    { count: phdCount },
    { count: totalFaculty },
    { count: legacySupervisorsCount },
    { count: legacyScholarsCount },
    { data: legacyConsultancy }
  ] = await Promise.all([
    manualStatsPromise,
    scopusPubsPromise,
    patentsPromise,
    legacyPubsPromise,
    legacyPatentsPromise,
    incentivePromise,
    legacyIncentivePromise,
    legacySeedPromise,
    liveSeedPromise,
    legacyGrantsPromise,
    liveGrantsPromise,
    phdCountPromise,
    totalFacultyPromise,
    legacySupervisorsPromise,
    legacyScholarsPromise,
    legacyConsultancyPromise
  ])

  const legacyPubs = legacyPubsRes?.count || 0
  const legacyPatents = legacyPatentsRes?.count || 0
  console.log('DEBUG: scopus_publications_count=', scopus_publications_count)
  console.log('DEBUG: legacyPubs=', legacyPubs)
  console.log('DEBUG: legacyPubsRes=', legacyPubsRes)

  const liveIncentivesTotal = incentiveData?.reduce((acc, curr) => acc + (Number(curr.calculated_amount) || 0), 0) || 0
  const legacyIncentivesTotal = legacyIncentiveData?.reduce((acc, curr) => acc + (Number(curr.received_amount) || 0), 0) || 0
  const incentives_total = liveIncentivesTotal + legacyIncentivesTotal

  const legacyTotal = legacySeedFund?.reduce((acc, r) => acc + (Number(r.amount_sanctioned) || 0), 0) || 0
  const liveTotal = liveSeedFund?.reduce((acc, r) => acc + (Number(r.amount_requested) || 0), 0) || 0
  const seed_fund_grants_total = legacyTotal + liveTotal

  const legacyGrantsTotal = legacyGrants?.reduce((acc, r) => acc + (Number(r.grant_amount) || 0), 0) || 0
  const legacyGrantsCount = legacyGrants?.length || 0

  const liveGrantsError = liveGrantsRes?.error
  let liveGrants = liveGrantsRes?.data || []
  if (liveGrantsError) {
    console.warn("Could not fetch project grants for stats (table might not exist):", liveGrantsError.message)
    liveGrants = []
  }
  const liveGrantsTotal = liveGrants.reduce((acc, r) => acc + (Number(r.total_proposed_budget) || 0), 0) || 0
  const liveGrantsCount = liveGrants.length || 0

  const project_grants_total = legacyGrantsTotal + liveGrantsTotal
  const project_grants_count = legacyGrantsCount + liveGrantsCount

  const consultancy_project_total = legacyConsultancy?.reduce((acc, r) => acc + (Number(r.amount) || 0), 0) || 0

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
