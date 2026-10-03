import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/server/api/errors'
import { assertTransition, type TaskStatus, type Priority } from '@/server/domain/task-status'
import { enc, dec, encN, decN, keyset, decodeCursor, toPage, newestFirst, type Page } from './_shared'

const T = 'tasks'

export type Task = {
  id: string
  projectId: string | null
  sectionId: string | null
  requesterId: string | null
  messageId: string | null
  title: string
  description: string | null
  sourceExcerpt: string | null
  status: TaskStatus
  priority: Priority
  dueAt: string | null
  aiConfidence: number | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TaskFilters = {
  status?: TaskStatus[]
  priority?: Priority[]
  projectId?: string
  sectionId?: string
  requesterId?: string
  messageId?: string
  dueFrom?: string
  dueTo?: string
  noDue?: boolean
}

export type TaskInput = {
  title: string
  description?: string | null
  projectId?: string | null
  sectionId?: string | null
  requesterId?: string | null
  messageId?: string | null
  sourceExcerpt?: string | null
  status?: 'draft' | 'confirmed'
  priority?: Priority
  dueAt?: string | null
  aiConfidence?: number | null
}

export type TaskPatch = Partial<
  Omit<TaskInput, 'status' | 'messageId' | 'sourceExcerpt' | 'aiConfidence'>
> & { status?: TaskStatus }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = (r: any): Task => ({
  id: r.id,
  projectId: r.project_id ?? null,
  sectionId: r.section_id,
  requesterId: r.requester_id,
  messageId: r.message_id,
  title: dec(T, 'title', r.title_enc),
  description: decN(T, 'description', r.description_enc),
  sourceExcerpt: decN(T, 'source_excerpt', r.source_excerpt_enc),
  status: r.status,
  priority: r.priority,
  dueAt: r.due_at,
  aiConfidence: r.ai_confidence == null ? null : Number(r.ai_confidence),
  completedAt: r.completed_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

function applyFilters<Q>(q: Q, f: TaskFilters): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let r: any = q
  if (f.status?.length) r = r.in('status', f.status)
  if (f.priority?.length) r = r.in('priority', f.priority)
  if (f.projectId) r = r.eq('project_id', f.projectId)
  if (f.sectionId) r = r.eq('section_id', f.sectionId)
  if (f.requesterId) r = r.eq('requester_id', f.requesterId)
  if (f.messageId) r = r.eq('message_id', f.messageId)
  if (f.dueFrom) r = r.gte('due_at', f.dueFrom)
  if (f.dueTo) r = r.lte('due_at', f.dueTo)
  if (f.noDue) r = r.is('due_at', null)
  return r
}

async function getRow(db: SupabaseClient, id: string) {
  const { data, error } = await db.from(T).select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!data) throw new ApiError(404, 'NOT_FOUND', 'Tarefa não encontrada')
  return data
}

export const tasksRepo = {
  async create(db: SupabaseClient, i: TaskInput): Promise<Task> {
    const { data, error } = await db
      .from(T)
      .insert({
        title_enc: enc(T, 'title', i.title),
        description_enc: encN(T, 'description', i.description),
        source_excerpt_enc: encN(T, 'source_excerpt', i.sourceExcerpt),
        project_id: i.projectId ?? null,
        section_id: i.sectionId ?? null,
        requester_id: i.requesterId ?? null,
        message_id: i.messageId ?? null,
        status: i.status ?? 'confirmed',
        priority: i.priority ?? 'normal',
        due_at: i.dueAt ?? null,
        ai_confidence: i.aiConfidence ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return map(data)
  },

  async get(db: SupabaseClient, id: string): Promise<Task> {
    return map(await getRow(db, id))
  },

  async list(
    db: SupabaseClient,
    f: TaskFilters,
    p: { limit: number; cursor?: string | null },
  ): Promise<Page<Task>> {
    let q = applyFilters(db.from(T).select('*'), f)
    q = keyset(q, decodeCursor(p.cursor))
    const { data, error } = await newestFirst(q).limit(p.limit + 1)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return toPage(data ?? [], p.limit, (r: any) => map(r))
  },

  async listAll(db: SupabaseClient, f: TaskFilters, max = 1000): Promise<Task[]> {
    const { data, error } = await applyFilters(db.from(T).select('*'), f)
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(max)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => map(r))
  },

  async count(db: SupabaseClient, f: TaskFilters): Promise<number> {
    const { count, error } = await applyFilters(
      db.from(T).select('id', { count: 'exact', head: true }),
      f,
    )
    if (error) throw error
    return count ?? 0
  },

  async update(db: SupabaseClient, id: string, p: TaskPatch): Promise<Task> {
    const cur = await getRow(db, id)
    const u: Record<string, unknown> = {}
    if (p.title !== undefined) u.title_enc = enc(T, 'title', p.title)
    if (p.description !== undefined) u.description_enc = encN(T, 'description', p.description)
    if (p.sectionId !== undefined) u.section_id = p.sectionId
    if (p.requesterId !== undefined) u.requester_id = p.requesterId
    if (p.priority !== undefined) u.priority = p.priority
    if (p.dueAt !== undefined) u.due_at = p.dueAt
    if (p.status && p.status !== cur.status) {
      assertTransition(cur.status as TaskStatus, p.status)
      u.status = p.status
      u.completed_at = p.status === 'done' ? new Date().toISOString() : null
    }
    if (!Object.keys(u).length) return map(cur)
    const { data, error } = await db.from(T).update(u).eq('id', id).select().single()
    if (error) throw error
    return map(data)
  },

  archive: (db: SupabaseClient, id: string) => tasksRepo.update(db, id, { status: 'archived' }),
}
