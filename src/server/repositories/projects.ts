import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enc, dec } from './_shared'

const T = 'projects'

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived'

export type Project = {
  id: string
  name: string
  slug: string
  color: string
  status: ProjectStatus
  description: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectInput = {
  name: string
  color?: string
  status?: ProjectStatus
  description?: string | null
}

function toProject(r: Record<string, unknown>): Project {
  return {
    id: r.id as string,
    name: dec(T, 'name', r.name_enc as string),
    slug: r.slug as string,
    color: r.color as string,
    status: r.status as ProjectStatus,
    description: r.description_enc ? dec(T, 'description', r.description_enc as string) : null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

export async function findAllProjects(
  db: SupabaseClient,
  status?: ProjectStatus[],
): Promise<Project[]> {
  let q = db.from(T).select('*').order('created_at', { ascending: false })
  if (status && status.length > 0) q = q.in('status', status)
  const { data, error } = await q
  if (error) throw error
  return (data as Record<string, unknown>[]).map(toProject)
}

export async function findProjectById(db: SupabaseClient, id: string): Promise<Project | null> {
  const { data, error } = await db.from(T).select('*').eq('id', id).single()
  if (error) return null
  return toProject(data as Record<string, unknown>)
}

export async function findProjectBySlug(db: SupabaseClient, slug: string): Promise<Project | null> {
  const { data, error } = await db.from(T).select('*').eq('slug', slug).single()
  if (error) return null
  return toProject(data as Record<string, unknown>)
}

export async function createProject(
  db: SupabaseClient,
  input: ProjectInput,
): Promise<Project> {
  const slug = slugify(input.name)
  const { data, error } = await db
    .from(T)
    .insert({
      name_enc: enc(T, 'name', input.name),
      slug,
      color: input.color ?? '#6ec1e4',
      status: input.status ?? 'active',
      description_enc: input.description ? enc(T, 'description', input.description) : null,
    })
    .select()
    .single()
  if (error) throw error
  return toProject(data as Record<string, unknown>)
}

export async function updateProject(
  db: SupabaseClient,
  id: string,
  input: Partial<ProjectInput>,
): Promise<Project> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) { patch.name_enc = enc(T, 'name', input.name); patch.slug = slugify(input.name) }
  if (input.color !== undefined) patch.color = input.color
  if (input.status !== undefined) patch.status = input.status
  if (input.description !== undefined) patch.description_enc = input.description ? enc(T, 'description', input.description) : null
  const { data, error } = await db.from(T).update(patch).eq('id', id).select().single()
  if (error) throw error
  return toProject(data as Record<string, unknown>)
}

export async function deleteProject(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.from(T).update({ status: 'archived' }).eq('id', id)
  if (error) throw error
}

export async function getProjectsOverview(db: SupabaseClient): Promise<
  (Project & { openTasks: number; overdueTasks: number; progress: number; fileCount: number; nextDueAt: string | null })[]
> {
  const projects = await findAllProjects(db)
  const now = new Date().toISOString()

  const results = await Promise.all(
    projects.map(async (p) => {
      const [tasksRes, filesRes] = await Promise.all([
        db.from('tasks').select('id,status,due_at,completed_at').eq('project_id', p.id).neq('status', 'archived'),
        db.from('project_files').select('id').eq('project_id', p.id),
      ])
      const tasks = (tasksRes.data ?? []) as { id: string; status: string; due_at: string | null; completed_at: string | null }[]
      const open = tasks.filter((t) => t.status !== 'done')
      const overdue = tasks.filter((t) => t.status !== 'done' && t.due_at && t.due_at < now)
      const done = tasks.filter((t) => t.status === 'done').length
      const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
      const nextDueAt = open
        .filter((t) => t.due_at)
        .sort((a, b) => a.due_at!.localeCompare(b.due_at!))
        .at(0)?.due_at ?? null

      return {
        ...p,
        openTasks: open.length,
        overdueTasks: overdue.length,
        progress,
        fileCount: filesRes.data?.length ?? 0,
        nextDueAt,
      }
    }),
  )
  return results
}
