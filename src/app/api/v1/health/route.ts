import { NextResponse } from 'next/server'

export const GET = () =>
  NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
