import { z } from 'zod'
import { route } from '@/server/api/route'
import { findProjectById, updateProject, deleteProject } from '@/server/repositories/projects'
import { ApiError } from '@/server/api/errors'

const paramsSchema = z.object({ id: z.string().uuid() })

const patchBody = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
  description: z.string().max(500).nullish(),
})

export const GET = route({ params: paramsSchema }, async ({ db, params }) => {
  const p = await findProjectById(db, params.id)
  if (!p) throw new ApiError(404, 'NOT_FOUND', 'Projeto não encontrado')
  return p
})

export const PATCH = route({ params: paramsSchema, body: patchBody }, async ({ db, params, body, audit }) => {
  const p = await updateProject(db, params.id, body)
  audit({ action: 'project.update', entity: 'project', entityId: p.id })
  return p
})

export const DELETE = route({ params: paramsSchema }, async ({ db, params, audit }) => {
  await deleteProject(db, params.id)
  audit({ action: 'project.archive', entity: 'project', entityId: params.id })
  return { ok: true }
})
