import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export async function GET() {
  const { user, supabase, error } = await getUser()
  if (!user) return error
  const { data, error: dbErr } = await supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { user, supabase, error } = await getUser()
  if (!user) return error
  const body = await req.json()
  const { data, error: dbErr } = await supabase.from('projects').insert({ ...body, user_id: user.id }).select().single()
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
