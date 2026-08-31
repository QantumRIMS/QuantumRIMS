import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const doi = searchParams.get('doi')
  if (!doi) return NextResponse.json({ exists: false })

  const admin = createAdminClient()
  const { data } = await admin
    .from('submissions')
    .select('id')
    .eq('doi', doi)
    .maybeSingle()

  return NextResponse.json({ exists: !!data })
}
