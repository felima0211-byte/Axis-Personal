import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export async function GET(req: Request) {
  const { user, supabase, error } = await getUser()
  if (!user) return error
  const url = new URL(req.url)
  let q = supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  const projectId = url.searchParams.get('project_id')
  const status = url.searchParams.get('status')
  const dueFrom = url.searchParams.get('due_from')
  const dueTo = url.searchParams.get('due_to')
  if (projectId) q = q.eq('project_id', projectId)
  if (status) q = q.in('status', status.split(','))
  if (dueFrom) q = q.gte('due_at', dueFrom)
  if (dueTo) q = q.lte('due_at', dueTo)
  const { data, error: dbErr } = await q
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { user, supabase, error } = await getUser()
  if (!user) return error
  const body = await req.json()
  const { data, error: dbErr } = await supabase.from('tasks').insert({ ...body, user_id: user.id }).select().single()
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
