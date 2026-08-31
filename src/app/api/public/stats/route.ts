import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { getReportsOverviewStats } from '@/lib/reportStats'

// Cache stats for 5 minutes — login page stats don't need to be real-time.
// Only the first request after expiry hits the DB; all others get instant cached response.
export const revalidate = 300 // 5 minutes
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdminClient()
  try {
    const stats = await getReportsOverviewStats(admin)
    return NextResponse.json(stats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
