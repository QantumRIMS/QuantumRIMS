import { NextResponse } from 'next/server'

// Staff chatbot has been removed. This endpoint is intentionally disabled.
export async function POST() {
  return NextResponse.json({ error: 'Gone' }, { status: 410 })
}

export async function GET() {
  return NextResponse.json({ error: 'Gone' }, { status: 410 })
}
