import { z } from 'zod'
import { route } from '@/server/api/route'
import { findAllProjects, createProject, type ProjectStatus } from '@/server/repositories/projects'

const projectStatuses: ProjectStatus[] = ['active', 'paused', 'completed', 'archived']

const createBody = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  description: z.string().max(500).nullish(),
})

const listQuery = z.object({
  status: z.string().optional(),
})

export const GET = route({ query: listQuery }, async ({ db, query }) => {
  const statuses = query.status
    ? (query.status.split(',').filter((s) => projectStatuses.includes(s as ProjectStatus)) as ProjectStatus[])
    : undefined
  return findAllProjects(db, statuses)
})

export const POST = route({ body: createBody, status: 201 }, async ({ db, body, audit }) => {
  const p = await createProject(db, body)
  audit({ action: 'project.create', entity: 'project', entityId: p.id })
  return p
})
