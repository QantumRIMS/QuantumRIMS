import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('funding_agencies')
      .select('*')
      .order('s_no', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error fetching funding agencies:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
