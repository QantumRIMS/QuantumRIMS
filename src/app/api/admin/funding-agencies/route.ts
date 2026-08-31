import { NextResponse } from 'next/server'
import { verifyToken, extractToken, requireAdmin } from '@/lib/verifyAuth'
import { createAdminClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const token = extractToken(req)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authResult = await verifyToken(token)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await requireAdmin(authResult)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { section, agency_name, website, contact_details } = body

    if (!section || !agency_name || !contact_details) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the highest s_no for the given section
    const { data: maxSnoData, error: maxSnoError } = await supabase
      .from('funding_agencies')
      .select('s_no')
      .eq('section', section)
      .order('s_no', { ascending: false })
      .limit(1)
      .single()

    // If maxSnoData is null, there are no entries for that section (unlikely but possible), start at 1 or handle appropriately.
    // However, if the section is 'National', the max might be 141. If 'International', the max might be 154.
    let nextSno = 1
    if (maxSnoData) {
      nextSno = maxSnoData.s_no + 1
    } else if (section === 'International') {
      nextSno = 143 // fallback if table is empty but we want to continue sequence, though not really necessary if it's completely empty
    }

    const { data, error } = await supabase
      .from('funding_agencies')
      .insert({
        section,
        agency_name,
        website: website || null,
        contact_details,
        s_no: nextSno
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error creating funding agency:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
