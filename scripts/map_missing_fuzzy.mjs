import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import ws_lib from 'ws'
dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws_lib } })

function normalizeName(name) {
  return (name || '').toLowerCase().replace(/[\.\s]+/g, '')
}

async function main() {
  console.log("Fetching master_faculty...")
  const { data: facultyList } = await supabase.from('master_faculty').select('emp_id, name')
  const nameToEmpId = {}
  facultyList.forEach(f => {
    const cleanName = normalizeName(f.name)
    if (cleanName) nameToEmpId[cleanName] = f.emp_id
  })

  let allPublications = []
  let page = 0
  while (true) {
    const { data: publications } = await supabase.from('legacy_publications').select('id, faculty_name, emp_id').range(page * 1000, (page + 1) * 1000 - 1)
    if (!publications || publications.length === 0) break
    allPublications = allPublications.concat(publications)
    page++
  }

  let updateCount = 0
  for (const pub of allPublications) {
    if (pub.emp_id) continue // already mapped
    if (!pub.faculty_name) continue

    const cleanPubName = normalizeName(pub.faculty_name)
    const mappedEmpId = nameToEmpId[cleanPubName]

    if (mappedEmpId) {
      await supabase.from('legacy_publications').update({ emp_id: mappedEmpId }).eq('id', pub.id)
      updateCount++
    }
  }

  console.log(`Fuzzy mapped additional: ${updateCount}`)
}

main()
