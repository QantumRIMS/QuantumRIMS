import dotenv from 'dotenv'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

dotenv.config({ path: '.env.local' })

const FILE_2026 = 'public/templates/Quantum_Pulse_Gugan_Faculty_Details_2026-2027_only.xlsx'

async function main() {
  const wb = XLSX.readFile(FILE_2026)
  const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  
  const missingIds = []

  for (const row of data) {
    const empId = String(row['Emp.ID'] || '').trim()
    const name = String(row['Name of the Faculty'] || '').trim()
    const dept = String(row['Dept.'] || '').trim()

    if (name && !empId) {
      missingIds.push(`${name} (${dept})`)
    }
  }

  console.log('--- Faculty Missing Employee IDs in 2026-2027 Excel ---')
  if (missingIds.length === 0) {
    console.log('None! All faculty have an Employee ID.')
  } else {
    missingIds.forEach((m, i) => console.log(`${i + 1}. ${m}`))
  }
}

main().catch(console.error)
