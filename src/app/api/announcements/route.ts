import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    }
  )

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')

  try {
    let query = supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (category) query = query.eq('category', category)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
