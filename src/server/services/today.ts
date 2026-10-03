import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { localYmd, startOfDay, endOfDay, mondayOf } from '@/server/time'
import { tasksRepo, type Task } from '@/server/repositories/tasks'
import { remindersRepo } from '@/server/repositories/reminders'
import { sectionsRepo, type Section } from '@/server/repositories/sections'
import { requestersRepo } from '@/server/repositories/requesters'
import type { TaskStatus, Priority } from '@/server/domain/task-status'

const ACTIVE: TaskStatus[] = ['confirmed', 'in_progress']
const RANK: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 }

const sortTasks = (a: Task[]) =>
  [...a].sort(
    (x, y) =>
      RANK[x.priority] - RANK[y.priority] ||
      (x.dueAt ?? '9').localeCompare(y.dueAt ?? '9'),
  )

type WithReq = Task & { requesterName: string | null }

function enrich(requesters: { id: string; name: string }[]) {
  const names = new Map(requesters.map((r) => [r.id, r.name]))
  return (t: Task): WithReq => ({
    ...t,
    requesterName: t.requesterId ? (names.get(t.requesterId) ?? null) : null,
  })
}

function groupBySection(tasks: WithReq[], sections: Section[]) {
  const groups: { section: Section | null; tasks: WithReq[] }[] = sections
    .map((s) => ({ section: s as Section | null, tasks: tasks.filter((t) => t.sectionId === s.id) }))
    .filter((g) => g.tasks.length)
  const loose = tasks.filter((t) => !t.sectionId || !sections.some((s) => s.id === t.sectionId))
  if (loose.length) groups.push({ section: null, tasks: loose })
  return groups
}

export async function getToday(db: SupabaseClient, tz: string, now = new Date()) {
  const ymd = localYmd(now, tz)
  const start = startOfDay(ymd, tz)
  const end = endOfDay(ymd, tz)
  const before = new Date(start.getTime() - 1).toISOString()

  const [overdue, today, highNoDue, remToday, remOverdue, drafts, sections, requesters] =
    await Promise.all([
      tasksRepo.listAll(db, { status: ACTIVE, dueTo: before }),
      tasksRepo.listAll(db, {
        status: ACTIVE,
        dueFrom: start.toISOString(),
        dueTo: end.toISOString(),
      }),
      tasksRepo.listAll(db, { status: ACTIVE, noDue: true, priority: ['high', 'urgent'] }),
      remindersRepo.listAll(db, {
        remindFrom: start.toISOString(),
        remindTo: end.toISOString(),
      }),
      remindersRepo.listAll(db, { remindTo: before }),
      tasksRepo.count(db, { status: ['draft'] }),
      sectionsRepo.list(db),
      requestersRepo.listAll(db),
    ])

  const withReq = enrich(requesters)
  return {
    date: ymd,
    timezone: tz,
    counts: { today: today.length, overdue: overdue.length, drafts },
    overdue: sortTasks(overdue).map(withReq),
    groups: groupBySection(
      sortTasks([...today, ...highNoDue]).map(withReq),
      sections,
    ),
    reminders: { today: remToday, overdue: remOverdue },
  }
}

export async function getUpcoming(
  db: SupabaseClient,
  tz: string,
  untilYmd?: string,
  now = new Date(),
) {
  const today = localYmd(now, tz)
  const until = untilYmd ?? `${today.slice(0, 4)}-12-31`
  const from = startOfDay(today, tz).toISOString()
  const to = endOfDay(until, tz).toISOString()

  const [tasks, reminders, requesters] = await Promise.all([
    tasksRepo.listAll(db, { status: ACTIVE, dueFrom: from, dueTo: to }),
    remindersRepo.listAll(db, { remindFrom: from, remindTo: to }),
    requestersRepo.listAll(db),
  ])

  const withReq = enrich(requesters)
  const items = [
    ...tasks.map((t) => ({ kind: 'task' as const, at: t.dueAt!, task: withReq(t) })),
    ...reminders.map((r) => ({ kind: 'reminder' as const, at: r.remindAt, reminder: r })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  const weeks = new Map<string, typeof items>()
  for (const it of items) {
    const key = mondayOf(localYmd(new Date(it.at), tz))
    weeks.set(key, [...(weeks.get(key) ?? []), it])
  }

  return {
    from: today,
    until,
    weeks: [...weeks].map(([weekStart, list]) => ({
      weekStart,
      count: list.length,
      items: list,
    })),
  }
}
