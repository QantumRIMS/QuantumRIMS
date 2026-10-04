import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

import ws_lib from 'ws'
dotenv.config({ path: '.env.local' })

// Using websockets avoids fetch timeouts for large datasets if applicable, but fetch is fine for simple scripts
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { realtime: { transport: ws_lib } })

async function main() {
  console.log("Fetching master_faculty...")
  const { data: facultyList, error: facErr } = await supabase.from('master_faculty').select('emp_id, name, dept')
  if (facErr) {
    console.error("Error fetching faculty:", facErr)
    return
  }

  // Create lookup dictionary for faculty by name (case-insensitive)
  const nameToEmpId = {}
  facultyList.forEach(f => {
    // Some names in master_faculty might have initials differently, but let's do an exact match first
    const cleanName = (f.name || '').trim().toLowerCase()
    if (cleanName) {
      nameToEmpId[cleanName] = f.emp_id
    }
  })

  console.log("Fetching legacy_publications...")
  let allPublications = []
  let page = 0
  const pageSize = 1000
  while (true) {
    const { data: publications, error: pubErr } = await supabase.from('legacy_publications').select('id, faculty_name').range(page * pageSize, (page + 1) * pageSize - 1)
    if (pubErr) {
      console.error("Error fetching publications:", pubErr)
      return
    }
    if (publications.length === 0) break
    allPublications = allPublications.concat(publications)
    page++
  }
  const publications = allPublications

  console.log(`Found ${publications.length} publications. Processing...`)
  let updateCount = 0
  let noMatchCount = 0
  let noNameCount = 0

  for (const pub of publications) {
    if (!pub.faculty_name || pub.faculty_name.trim() === '') {
      noNameCount++
      continue
    }

    const cleanPubName = pub.faculty_name.trim().toLowerCase()
    const mappedEmpId = nameToEmpId[cleanPubName]

    if (mappedEmpId) {
      const { error: updErr } = await supabase
        .from('legacy_publications')
        .update({ emp_id: mappedEmpId })
        .eq('id', pub.id)

      if (updErr) {
        console.error(`Error updating pub ${pub.id}:`, updErr)
      } else {
        updateCount++
      }
    } else {
      noMatchCount++
    }
  }

  console.log("===============================")
  console.log(`Total Publications processed: ${publications.length}`)
  console.log(`Successfully mapped to Emp ID: ${updateCount}`)
  console.log(`No matching name in master_faculty: ${noMatchCount}`)
  console.log(`No faculty name in publication record: ${noNameCount}`)
  console.log("===============================")
}

main()
