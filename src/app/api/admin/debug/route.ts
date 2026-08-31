import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from('legacy_consultancy').select('*')
    return NextResponse.json({ success: true, count: data?.length || 0, data, error })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
