const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function clearDemoData() {
  const tables = [
    'incentive_applications',
    'seed_fund_final_submissions',
    'seed_fund_project_documents',
    'seed_fund_ppt_submissions',
    'seed_fund_requisitions',
    'seed_fund_requests',
    'seed_fund_applications',
    'consultancy_applications',
    'research_grants',
    'project_grant_applications',
    'submissions'
  ]

  for (const table of tables) {
    console.log(`Clearing ${table}...`)
    
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?id=not.is.null`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      }
    })

    if (!response.ok) {
      const err = await response.text()
      // Ignore if table doesn't exist
      if (err.includes("Could not find the table")) {
        console.log(`Table ${table} does not exist in schema cache, skipping.`)
      } else {
        console.error(`Error deleting from ${table}:`, err)
      }
    } else {
      const deletedData = await response.json()
      console.log(`Deleted ${deletedData.length} rows from ${table}`)
    }
  }
}

clearDemoData().then(() => console.log('Done')).catch(console.error)
