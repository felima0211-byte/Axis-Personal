import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, supabase, error } = await getUser()
  if (!user) return error
  const { data, error: dbErr } = await supabase.from('projects').select('*').eq('id', id).eq('user_id', user.id).single()
  if (dbErr) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, supabase, error } = await getUser()
  if (!user) return error
  const body = await req.json()
  const { data, error: dbErr } = await supabase.from('projects').update(body).eq('id', id).eq('user_id', user.id).select().single()
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, supabase, error } = await getUser()
  if (!user) return error
  await supabase.from('projects').update({ status: 'archived' }).eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
