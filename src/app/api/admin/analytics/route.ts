import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { verifyToken, extractToken } from '@/lib/verifyAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const admin = createAdminClient()
  const token = extractToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = await verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const yearFilter = url.searchParams.get('year') || ''
  const deptFilter = url.searchParams.get('department') || ''

  try {
    // 1. Fetch Submissions (Scopus)
    let subQuery = admin.from('submissions').select('department, year').eq('status', 'approved')
    if (yearFilter) subQuery = subQuery.eq('year', parseInt(yearFilter))
    if (deptFilter) subQuery = subQuery.eq('department', deptFilter)
    const { data: submissions } = await subQuery

    // 2. Fetch Incentives and Patents
    let incQuery = admin.from('incentive_applications').select('category, department, year, calculated_amount').eq('status', 'approved')
    if (yearFilter) incQuery = incQuery.eq('year', parseInt(yearFilter))
    if (deptFilter) incQuery = incQuery.eq('department', deptFilter)
    const { data: incentives } = await incQuery

    // 3. Fetch Seed Funds
    const { data: rawSeedFunds } = await admin.from('seed_fund_applications').select('applicant_id, created_at, amount_requested').eq('status', 'approved')

    // 4. Fetch Consultancy
    const { data: rawConsultancies } = await admin.from('consultancy_applications').select('applicant_id, created_at, consultancy_fee').eq('status', 'approved')

    // 5. Fetch Project Grants (Live)
    const { data: rawProjectGrants } = await admin.from('project_grant_applications').select('applicant_id, created_at, total_proposed_budget').eq('status', 'approved')

    const allApplicantIds = new Set([
      ...(rawSeedFunds || []).map(s => s.applicant_id),
      ...(rawConsultancies || []).map(c => c.applicant_id),
      ...(rawProjectGrants || []).map(g => g.applicant_id)
    ])
    
    let facultyMap: Record<string, string> = {}
    if (allApplicantIds.size > 0) {
      const { data: facultyData } = await admin.from('master_faculty').select('user_id, dept').in('user_id', Array.from(allApplicantIds))
      facultyMap = (facultyData || []).reduce((acc: any, f: any) => {
        acc[f.user_id] = f.dept || ''
        return acc
      }, {})
    }

    const getYearFromDate = (dateStr: string | null) => {
      if (!dateStr) return null
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      const y = d.getFullYear()
      const m = d.getMonth() + 1
      return m >= 6 ? y : y - 1
    }

    const seedFunds = (rawSeedFunds || []).map(item => ({
      department: facultyMap[item.applicant_id] || '',
      year: getYearFromDate(item.created_at),
      amount_requested: item.amount_requested
    })).filter(item => {
      if (yearFilter && item.year !== parseInt(yearFilter)) return false
      if (deptFilter && item.department !== deptFilter) return false
      return true
    })

    const consultancies = (rawConsultancies || []).map(item => ({
      department: facultyMap[item.applicant_id] || '',
      year: getYearFromDate(item.created_at),
      sanctioned_amount: item.consultancy_fee
    })).filter(item => {
      if (yearFilter && item.year !== parseInt(yearFilter)) return false
      if (deptFilter && item.department !== deptFilter) return false
      return true
    })

    const projectGrants = (rawProjectGrants || []).map(item => ({
      department: facultyMap[item.applicant_id] || '',
      year: getYearFromDate(item.created_at),
      total_proposed_budget: item.total_proposed_budget
    })).filter(item => {
      if (yearFilter && item.year !== parseInt(yearFilter)) return false
      if (deptFilter && item.department !== deptFilter) return false
      return true
    })

    // 8. Fetch Legacy Data for completeness
    const { data: legacyPatentsData } = await admin.from('legacy_patents').select('*')
    let legacyPatents = legacyPatentsData || []
    if (deptFilter) legacyPatents = legacyPatents.filter(p => p.department === deptFilter)
    if (yearFilter) legacyPatents = legacyPatents.filter(p => {
      const pYear = p.academic_year ? parseInt(p.academic_year.split('-')[0]) : null
      return pYear === parseInt(yearFilter) || p.academic_year?.includes(yearFilter)
    })

    let legacyPubs: any[] = []
    let hasMorePubs = true
    let pagePubs = 0
    const pageSizePubs = 1000

    while (hasMorePubs) {
      let query = admin.from('legacy_publications').select('department, year, is_duplicate, document_type_report').range(pagePubs * pageSizePubs, (pagePubs + 1) * pageSizePubs - 1)
      if (yearFilter) {
        query = query.eq('year', parseInt(yearFilter))
      }
      if (deptFilter) {
        query = query.ilike('department', deptFilter)
      }
      
      const { data: pageData } = await query
      if (pageData && pageData.length > 0) {
        legacyPubs = [...legacyPubs, ...pageData]
        if (pageData.length < pageSizePubs) {
          hasMorePubs = false
        } else {
          pagePubs++
        }
      } else {
        hasMorePubs = false
      }
    }

    let legacySeedQuery = admin.from('legacy_seed_fund_grants').select('dept, academic_year, amount_sanctioned')
    if (deptFilter) legacySeedQuery = legacySeedQuery.eq('dept', deptFilter)
    const { data: legacySeedFunds } = await legacySeedQuery

    let legacyGrantQuery = admin.from('research_grants').select('department, academic_year, grant_amount')
    if (deptFilter) legacyGrantQuery = legacyGrantQuery.eq('department', deptFilter)
    const { data: legacyResearchGrants } = await legacyGrantQuery

    let legacyIncQuery = admin.from('legacy_incentives').select('department, received_amount, amount_credited_date, submitted_date, date_of_publication, incentive_year')
    if (deptFilter) legacyIncQuery = legacyIncQuery.eq('department', deptFilter)
    const { data: legacyIncentives } = await legacyIncQuery

    // Paginate legacy_consultancy to guarantee all rows are fetched regardless
    // of the PostgREST server-side max_rows setting.
    let legacyConsultancy: any[] = []
    {
      let lcFrom = 0
      const lcStep = 1000
      while (true) {
        let lcQuery = admin
          .from('legacy_consultancy')
          .select('department, academic_year, project_date, amount')
          .range(lcFrom, lcFrom + lcStep - 1)
        if (deptFilter) lcQuery = lcQuery.eq('department', deptFilter)
        const { data: lcPage } = await lcQuery
        if (lcPage && lcPage.length > 0) {
          legacyConsultancy.push(...lcPage)
          if (lcPage.length < lcStep) break
          lcFrom += lcStep
        } else {
          break
        }
      }
    }

    // 6. Fetch PhD Holders
    let phdQuery = admin.from('master_faculty').select('dept').eq('type', 'Doctorate')
    if (deptFilter) phdQuery = phdQuery.eq('dept', deptFilter)
    const { data: phds } = await phdQuery

    // Supervisors and Scholars
    let supQuery = admin.from('legacy_research_supervisors').select('department, academic_year')
    if (deptFilter) supQuery = supQuery.eq('department', deptFilter)
    const { data: supervisors } = await supQuery

    let schQuery = admin.from('legacy_research_scholars').select('research_centre, academic_year')
    if (deptFilter) schQuery = schQuery.eq('research_centre', deptFilter)
    const { data: scholars } = await schQuery

    // 7. Manual Stats (static)
    const { data: manualStats } = await admin.from('report_manual_stats').select('*').eq('id', 1).maybeSingle()

    // Aggregate Data
    const STANDARD_DEPTS = ['CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CYS', 'AI-DS', 'AI-ML', 'CSBS', 'S&H']
    
    const normalizeDept = (d: string | null | undefined) => {
       if (!d) return 'Others'
       const upper = d.toUpperCase().trim()
       if (upper.includes('S&H') || upper.includes('S & H') || upper.includes('MATHS') || upper.includes('PHYSICS') || upper.includes('CHEMISTRY') || upper.includes('ENGLISH') || upper.includes('SCIENCE')) return 'S&H'
       if (upper === 'MECH' || upper === 'MECHANICAL') return 'MECH'
       if (upper === 'CSE' || upper === 'CS') return 'CSE'
       if (upper === 'ECE') return 'ECE'
       if (upper === 'EEE') return 'EEE'
       if (upper === 'IT') return 'IT'
       if (upper === 'CYS' || upper.includes('CYBER')) return 'CYS'
       if (upper === 'AIDS' || upper === 'AI&DS' || upper === 'AI-DS') return 'AI-DS'
       if (upper === 'AIML' || upper === 'AI&ML' || upper === 'AI-ML') return 'AI-ML'
       if (upper === 'CSBS') return 'CSBS'
       if (upper === 'CCE') return 'CCE'
       if (STANDARD_DEPTS.includes(upper)) return upper
       return 'Others'
    }

    const initDeptRecord = () => {
      const rec: Record<string, number> = {}
      STANDARD_DEPTS.forEach(d => rec[d] = 0)
      rec['CCE'] = 0
      rec['Others'] = 0
      return rec
    }

    const scopusByDept = initDeptRecord()
    const scopusByYear: Record<string, number> = {}
    const sciPublicationsByDept = initDeptRecord()

    submissions?.forEach(s => {
      if (s.department) {
        const d = normalizeDept(s.department)
        scopusByDept[d] = (scopusByDept[d] || 0) + 1
      }
      if (s.year) scopusByYear[s.year] = (scopusByYear[s.year] || 0) + 1
    })
    
    legacyPubs?.forEach((p: any) => {
      const d = normalizeDept(p.department)
      scopusByDept[d] = (scopusByDept[d] || 0) + 1
      
      if (p.document_type_report === 'SCI') {
        sciPublicationsByDept[d] = (sciPublicationsByDept[d] || 0) + 1
      }
      if (p.year) scopusByYear[p.year] = (scopusByYear[p.year] || 0) + 1
    })

    const patentsByDept = initDeptRecord()
    const patentsByYear: Record<string, number> = {}
    const incAmountByDept = initDeptRecord()
    const incAmountByYear: Record<string, number> = {}

    incentives?.forEach(i => {
      if (i.category === 'patent') {
        if (i.department) {
          const d = normalizeDept(i.department)
          patentsByDept[d] = (patentsByDept[d] || 0) + 1
        }
        if (i.year) patentsByYear[i.year] = (patentsByYear[i.year] || 0) + 1
      }
      const amt = Number(i.calculated_amount) || 0
      if (i.department) {
        const d = normalizeDept(i.department)
        incAmountByDept[d] = (incAmountByDept[d] || 0) + amt
      }
      if (i.year) incAmountByYear[i.year] = (incAmountByYear[i.year] || 0) + amt
    })

    legacyIncentives?.forEach(i => {
      const amt = Number(i.received_amount) || 0
      
      let iYear = null
      if (i.amount_credited_date) iYear = getYearFromDate(i.amount_credited_date)
      if (!iYear && i.submitted_date) iYear = getYearFromDate(i.submitted_date)
      if (!iYear && i.date_of_publication) iYear = getYearFromDate(i.date_of_publication)
      if (!iYear && i.incentive_year) iYear = parseInt(i.incentive_year.split('-')[0])

      if (yearFilter && iYear !== parseInt(yearFilter) && !i.incentive_year?.includes(yearFilter)) return
      
      if (i.department) {
        const d = normalizeDept(i.department)
        incAmountByDept[d] = (incAmountByDept[d] || 0) + amt
      }
      if (iYear) incAmountByYear[iYear] = (incAmountByYear[iYear] || 0) + amt
    })

    legacyPatents?.forEach(p => {
      if (p.department) {
        const d = normalizeDept(p.department)
        patentsByDept[d] = (patentsByDept[d] || 0) + 1
      }
      const year = p.academic_year ? parseInt(p.academic_year.split('-')[0]) : null
      if (year) patentsByYear[year] = (patentsByYear[year] || 0) + 1
    })

    const seedAmountByDept = initDeptRecord()
    const seedAmountByYear: Record<string, number> = {}
    seedFunds?.forEach(s => {
      const amt = Number(s.amount_requested) || 0
      if (s.department) {
        const d = normalizeDept(s.department)
        seedAmountByDept[d] = (seedAmountByDept[d] || 0) + amt
      }
      if (s.year) seedAmountByYear[s.year] = (seedAmountByYear[s.year] || 0) + amt
    })

    legacySeedFunds?.forEach(s => {
      const amt = Number(s.amount_sanctioned) || 0
      const sYear = s.academic_year ? parseInt(s.academic_year.split('-')[0]) : null
      if (yearFilter && sYear !== parseInt(yearFilter) && !s.academic_year?.includes(yearFilter)) return
      if (s.dept) {
        const d = normalizeDept(s.dept)
        seedAmountByDept[d] = (seedAmountByDept[d] || 0) + amt
      }
      if (sYear) seedAmountByYear[sYear] = (seedAmountByYear[sYear] || 0) + amt
    })

    const consAmountByDept = initDeptRecord()
    const consAmountByYear: Record<string, number> = {}
    consultancies?.forEach(c => {
      const amt = Number(c.sanctioned_amount) || 0
      if (c.department) {
        const d = normalizeDept(c.department)
        consAmountByDept[d] = (consAmountByDept[d] || 0) + amt
      }
      if (c.year) consAmountByYear[c.year] = (consAmountByYear[c.year] || 0) + amt
    })

    legacyConsultancy?.forEach(c => {
      const amt = Number(c.amount) || 0
      let cYear: number | null = null
      if (c.project_date && c.project_date !== 'null') cYear = getYearFromDate(c.project_date)
      // Fallback: derive year from academic_year string (e.g. '2026-2027' → 2026)
      if (!cYear && c.academic_year) cYear = parseInt(c.academic_year.split('-')[0])

      if (yearFilter) {
        const yf = parseInt(yearFilter)
        // Match if the derived year equals the filter year, OR the academic_year
        // string starts with '<yearFilter>-' (e.g. '2026-2027' matches yearFilter='2026').
        // Using startsWith instead of includes avoids '2025-2026' falsely matching '2026'.
        const yearMatches =
          cYear === yf ||
          c.academic_year?.startsWith(yearFilter + '-')
        if (!yearMatches) return
      }

      if (c.department) {
        const d = normalizeDept(c.department)
        consAmountByDept[d] = (consAmountByDept[d] || 0) + amt
      }
      if (cYear) consAmountByYear[cYear] = (consAmountByYear[cYear] || 0) + amt
    })

    const grantAmountByDept = initDeptRecord()
    const grantAmountByYear: Record<string, number> = {}
    projectGrants?.forEach(g => {
      const amt = Number(g.total_proposed_budget) || 0
      if (g.department) {
        const d = normalizeDept(g.department)
        grantAmountByDept[d] = (grantAmountByDept[d] || 0) + amt
      }
      if (g.year) grantAmountByYear[g.year] = (grantAmountByYear[g.year] || 0) + amt
    })

    legacyResearchGrants?.forEach(g => {
      const amt = Number(g.grant_amount) || 0
      const gYear = g.academic_year ? parseInt(g.academic_year.split('-')[0]) : null
      if (yearFilter && gYear !== parseInt(yearFilter) && !g.academic_year?.includes(yearFilter)) return
      if (g.department) {
        const d = normalizeDept(g.department)
        grantAmountByDept[d] = (grantAmountByDept[d] || 0) + amt
      }
      if (gYear) grantAmountByYear[gYear] = (grantAmountByYear[gYear] || 0) + amt
    })

    const phdByDept = initDeptRecord()
    phds?.forEach(p => {
      if (p.dept) {
        const d = normalizeDept(p.dept)
        phdByDept[d] = (phdByDept[d] || 0) + 1
      }
    })

    const supervisorsByDept = initDeptRecord()
    const supervisorsByYear: Record<string, number> = {}
    let supervisorsCount = 0
    supervisors?.forEach(s => {
      const year = s.academic_year ? parseInt(s.academic_year.split('-')[0]) : null
      if (yearFilter && year !== parseInt(yearFilter) && !s.academic_year?.includes(yearFilter)) return
      supervisorsCount++
      if (s.department) {
        const d = normalizeDept(s.department)
        supervisorsByDept[d] = (supervisorsByDept[d] || 0) + 1
      }
      if (year) supervisorsByYear[year] = (supervisorsByYear[year] || 0) + 1
    })

    const scholarsByDept = initDeptRecord()
    const scholarsByYear: Record<string, number> = {}
    let scholarsCount = 0
    scholars?.forEach(s => {
      const year = s.academic_year ? parseInt(s.academic_year.split('-')[0]) : null
      if (yearFilter && year !== parseInt(yearFilter) && !s.academic_year?.includes(yearFilter)) return
      scholarsCount++
      if (s.research_centre) {
        const d = normalizeDept(s.research_centre)
        scholarsByDept[d] = (scholarsByDept[d] || 0) + 1
      }
      if (year) scholarsByYear[year] = (scholarsByYear[year] || 0) + 1
    })

    // Convert to arrays for recharts
    const formatData = (obj: Record<string, number>, keyName = 'name', valName = 'value') => 
      Object.keys(obj).sort().map(k => ({ [keyName]: k, [valName]: obj[k] }))

    return NextResponse.json({
      success: true,
      data: {
        scopus: {
          byDept: formatData(scopusByDept),
          byYear: formatData(scopusByYear)
        },
        sciPublications: {
          byDept: formatData(sciPublicationsByDept)
        },
        patents: {
          byDept: formatData(patentsByDept),
          byYear: formatData(patentsByYear)
        },
        incentives: {
          byDept: formatData(incAmountByDept),
          byYear: formatData(incAmountByYear)
        },
        seedFunds: {
          byDept: formatData(seedAmountByDept),
          byYear: formatData(seedAmountByYear)
        },
        consultancies: {
          byDept: formatData(consAmountByDept),
          byYear: formatData(consAmountByYear)
        },
        projectGrants: {
          byDept: formatData(grantAmountByDept),
          byYear: formatData(grantAmountByYear)
        },
        phds: {
          byDept: formatData(phdByDept)
        },
        supervisors: {
          byDept: formatData(supervisorsByDept),
          byYear: formatData(supervisorsByYear)
        },
        scholars: {
          byDept: formatData(scholarsByDept),
          byYear: formatData(scholarsByYear)
        },
        manualStats: {
          ...manualStats,
          au_research_supervisors_count: supervisorsCount,
          au_research_scholars_count: scholarsCount,
          research_funds_total: manualStats?.research_funds_total ?? 5400000
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
