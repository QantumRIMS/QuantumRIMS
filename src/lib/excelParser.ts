import ExcelJS from 'exceljs'
import path from 'path'
import fs from 'fs'

const CACHE_PATH = path.join(process.cwd(), '.excel_cache.json')

function getCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const stats = fs.statSync(CACHE_PATH)
      if (Date.now() - stats.mtimeMs < 60 * 60 * 1000) {
        return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
      }
    }
  } catch(e) {}
  return null
}

function saveCache(data: any) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data), 'utf8')
  } catch(e) {}
}

let memCache: any = null;

export async function getPublicationsFromExcel(filterYear: string | null = null, filterDept: string | null = null) {
  if (!memCache) memCache = getCache()
  
  if (!memCache || !memCache.pubs) {
    console.log('Parsing Excel for Publications...')
    const workbook = new ExcelJS.Workbook()
    const filePath = path.join(process.cwd(), 'public', 'templates', 'SECE Publications.xlsx')
    await workbook.xlsx.readFile(filePath)
    
    const pubSheet = workbook.getWorksheet('2024 -2025-2026')
    const pubRows: any[] = []
  
  if (pubSheet) {
    pubSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const vals = row.values as any[]
      if (!vals[2] && !vals[3]) return
      
      const getText = (val: any) => {
        if (!val) return null
        if (typeof val === 'object') {
          if (val.richText) return val.richText.map((rt: any) => rt.text).join('')
          if (val.text) return val.text
        }
        return String(val).trim()
      }

      const title = getText(vals[3])
      if (!title) return
      
      const yearStr = getText(vals[7])
      const year = yearStr ? parseInt(yearStr) : null

      pubRows.push({
        id: rowNumber,
        s_no: parseInt(vals[1]) || rowNumber - 1,
        authors: getText(vals[2]),
        title: title,
        source_title: getText(vals[4]),
        volume: getText(vals[5]),
        issue: getText(vals[6]),
        year: year,
        doi: getText(vals[8]),
        link: getText(vals[9]),
        document_type_scopus: getText(vals[10]),
        document_type_report: getText(vals[11]),
        department: getText(vals[12]),
        faculty_name: getText(vals[13])
      })
    })
  }
  
    memCache = { ...(memCache || {}), pubs: pubRows }
    saveCache(memCache)
  }
  
  let result = memCache.pubs
  if (filterYear && filterYear !== 'all') {
    result = result.filter((p: any) => String(p.year) === filterYear)
  }
  if (filterDept && filterDept !== 'all') {
    result = result.filter((p: any) => p.department === filterDept)
  }
  
  const departments = [...new Set(memCache.pubs.map((p: any) => p.department).filter(Boolean))] as string[]
  
  result = [...result].sort((a, b) => {
    if (a.year !== b.year) return (b.year || 0) - (a.year || 0)
    return (a.s_no || 0) - (b.s_no || 0)
  })
  
  return { data: result, departments }
}

let patCacheTime = 0;

export async function getPatentsFromExcel(filterYear: string | null = null, filterDept: string | null = null, startDate: string | null = null, endDate: string | null = null) {
  if (!memCache) memCache = getCache()
  
  if (!memCache || !memCache.patents) {
    console.log('Parsing Excel for Patents...')
    const workbook = new ExcelJS.Workbook()
    const filePath = path.join(process.cwd(), 'public', 'templates', 'SECE Publications.xlsx')
    await workbook.xlsx.readFile(filePath)
    
    const patentRows: any[] = []
    const patentSheets = ['Patent - 2025', 'Patent - 2026']
    let globalId = 1
  
  for (const sheetName of patentSheets) {
    const sheet = workbook.getWorksheet(sheetName)
    if (!sheet) continue
    
    const fallbackAcy = sheetName.includes('2025') ? '2024-2025' : '2025-2026'
    
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return
      
      const vals = row.values as any[]
      if (!vals[2] && !vals[3] && !vals[6]) return
      
      const getText = (val: any) => {
        if (!val) return null
        if (typeof val === 'object') {
          if (val.richText) return val.richText.map((rt: any) => rt.text).join('')
          if (val.text) return val.text
        }
        return String(val).trim()
      }
      
      const getDate = (val: any) => {
        if (!val) return null
        if (val instanceof Date) return val.toISOString().split('T')[0]
        try {
          const d = new Date(val)
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
        } catch(e) {}
        return null
      }

      const title = getText(vals[6])
      if (!title && !getText(vals[3])) return
      
      let acy = getText(vals[14])
      if (!acy || acy.length < 4) acy = fallbackAcy

      patentRows.push({
        id: globalId++,
        department: getText(vals[2]),
        application_number: getText(vals[3]),
        status: getText(vals[4]),
        inventors: getText(vals[5]),
        title: title,
        applicants: getText(vals[7]),
        filed_date: getDate(vals[8]),
        published_or_granted_date: getDate(vals[9]),
        publication_or_grant_number: getText(vals[10]),
        assignee: getText(vals[11]),
        proof_link: getText(vals[12]),
        academic_year: acy,
        institute_faculty: getText(vals[15]),
        type: getText(vals[16]),
        name_of_faculty: getText(vals[17]),
      })
    })
  }
  
    memCache = { ...(memCache || {}), patents: patentRows }
    saveCache(memCache)
  }
  
  let result = memCache.patents
  if (filterYear && filterYear !== 'all') {
    result = result.filter((p: any) => p.academic_year === filterYear)
  }
  if (filterDept && filterDept !== 'all') {
    result = result.filter((p: any) => p.department === filterDept)
  }
  if (startDate) {
    result = result.filter((p: any) => p.filed_date && p.filed_date >= startDate)
  }
  if (endDate) {
    result = result.filter((p: any) => p.filed_date && p.filed_date <= endDate)
  }
  
  const departments = [...new Set(memCache.patents.map((p: any) => p.department).filter(Boolean))] as string[]
  
  result = [...result].sort((a, b) => {
    if (a.academic_year !== b.academic_year) return (b.academic_year || '').localeCompare(a.academic_year || '')
    const da = a.filed_date ? new Date(a.filed_date).getTime() : 0
    const db = b.filed_date ? new Date(b.filed_date).getTime() : 0
    return db - da
  })
  
  return { data: result, departments }
}
