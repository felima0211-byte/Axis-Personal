import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'

export async function GET() {
  const { user, supabase, error } = await getUser()
  if (!user) return error
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const [tasksRes, remindersRes, projectsRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', user.id).not('status', 'in', '(done,archived)'),
    supabase.from('reminders').select('*').eq('user_id', user.id).is('done_at', null).gte('remind_at', todayStart).lt('remind_at', todayEnd),
    supabase.from('projects').select('id,name,color').eq('user_id', user.id),
  ])

  const tasks = (tasksRes.data ?? []) as { id: string; status: string; due_at: string | null; project_id: string | null; title: string; priority: string }[]
  const overdue = tasks.filter((t) => t.due_at && t.due_at < todayStart)
  const today = tasks.filter((t) => t.due_at && t.due_at >= todayStart && t.due_at < todayEnd)
  const drafts = tasks.filter((t) => t.status === 'draft')

  return NextResponse.json({
    overdue,
    today,
    draftsCount: drafts.length,
    reminders: remindersRes.data ?? [],
    projects: projectsRes.data ?? [],
  })
}
