import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export async function GET(req: Request) {
  const { user, supabase, error } = await getUser()
  if (!user) return error
  const url = new URL(req.url)
  const projectId = url.searchParams.get('project_id')
  let q = supabase.from('messages').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (projectId) q = q.eq('project_id', projectId)
  const { data, error: dbErr } = await q
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const { user, supabase, error } = await getUser()
  if (!user) return error
  const { content, project_id, requester_name } = await req.json()
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({ content, project_id: project_id || null, requester_name: requester_name || null, user_id: user.id, extraction_status: 'done' })
    .select().single()
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  // Criar tarefas draft a partir das linhas da conversa
  const lines = content.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 15)
  const tasks = lines.slice(0, 10).map((title: string) => ({
    title: title.slice(0, 140),
    status: 'draft',
    priority: 'normal',
    user_id: user.id,
    project_id: project_id || null,
    source_excerpt: title.slice(0, 300),
  }))
  if (tasks.length > 0) {
    await supabase.from('tasks').insert(tasks)
  }
  return NextResponse.json({ message: msg, tasksCreated: tasks.length }, { status: 201 })
}
