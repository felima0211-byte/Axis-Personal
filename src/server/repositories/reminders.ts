import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/server/api/errors'
import { enc, dec, keyset, decodeCursor, toPage, newestFirst, type Page } from './_shared'

const T = 'reminders'

export type Reminder = {
  id: string
  taskId: string | null
  sectionId: string | null
  title: string
  remindAt: string
  doneAt: string | null
  recurrence: string | null
  createdAt: string
}

export type ReminderFilters = {
  remindFrom?: string
  remindTo?: string
  includeDone?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = (r: any): Reminder => ({
  id: r.id,
  taskId: r.task_id,
  sectionId: r.section_id,
  title: dec(T, 'title', r.title_enc),
  remindAt: r.remind_at,
  doneAt: r.done_at,
  recurrence: r.recurrence,
  createdAt: r.created_at,
})

function applyFilters<Q>(q: Q, f: ReminderFilters): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let r: any = q
  if (!f.includeDone) r = r.is('done_at', null)
  if (f.remindFrom) r = r.gte('remind_at', f.remindFrom)
  if (f.remindTo) r = r.lte('remind_at', f.remindTo)
  return r
}

async function getRow(db: SupabaseClient, id: string) {
  const { data, error } = await db.from(T).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'NOT_FOUND', 'Lembrete não encontrado')
  return data
}

export const remindersRepo = {
  async create(
    db: SupabaseClient,
    i: {
      title: string
      remindAt: string
      taskId?: string | null
      sectionId?: string | null
      recurrence?: string | null
    },
  ): Promise<Reminder> {
    const { data, error } = await db
      .from(T)
      .insert({
        title_enc: enc(T, 'title', i.title),
        remind_at: i.remindAt,
        task_id: i.taskId ?? null,
        section_id: i.sectionId ?? null,
        recurrence: i.recurrence ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return map(data)
  },

  async get(db: SupabaseClient, id: string): Promise<Reminder> {
    return map(await getRow(db, id))
  },

  async list(
    db: SupabaseClient,
    f: ReminderFilters,
    p: { limit: number; cursor?: string | null },
  ): Promise<Page<Reminder>> {
    let q = applyFilters(db.from(T).select('*'), f)
    q = keyset(q, decodeCursor(p.cursor))
    const { data, error } = await newestFirst(q).limit(p.limit + 1)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return toPage(data ?? [], p.limit, (r: any) => map(r))
  },

  async listAll(db: SupabaseClient, f: ReminderFilters, max = 1000): Promise<Reminder[]> {
    const { data, error } = await applyFilters(db.from(T).select('*'), f)
      .order('remind_at', { ascending: true })
      .limit(max)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => map(r))
  },

  async update(
    db: SupabaseClient,
    id: string,
    p: {
      title?: string
      remindAt?: string
      taskId?: string | null
      sectionId?: string | null
      recurrence?: string | null
    },
  ): Promise<Reminder> {
    const u: Record<string, unknown> = {}
    if (p.title !== undefined) u.title_enc = enc(T, 'title', p.title)
    if (p.remindAt !== undefined) u.remind_at = p.remindAt
    if (p.taskId !== undefined) u.task_id = p.taskId
    if (p.sectionId !== undefined) u.section_id = p.sectionId
    if (p.recurrence !== undefined) u.recurrence = p.recurrence
    if (!Object.keys(u).length) return remindersRepo.get(db, id)
    const { data, error } = await db.from(T).update(u).eq('id', id).select().maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Lembrete não encontrado')
    return map(data)
  },

  async complete(db: SupabaseClient, id: string): Promise<Reminder> {
    const { data, error } = await db
      .from(T)
      .update({ done_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Lembrete não encontrado')
    return map(data)
  },

  async remove(db: SupabaseClient, id: string): Promise<void> {
    await getRow(db, id)
    const { error } = await db.from(T).delete().eq('id', id)
    if (error) throw error
  },
}
