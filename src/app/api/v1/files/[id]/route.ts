import { z } from 'zod'
import { route } from '@/server/api/route'
import { deleteFile } from '@/server/services/upload'
import { encryptField } from '@/server/crypto'

const paramsSchema = z.object({ id: z.string().uuid() })
const patchBody = z.object({
  name: z.string().min(1).max(150).optional(),
  mapping: z.record(z.string(), z.unknown()).optional(),
  googleRange: z.string().max(100).optional(),
  googleTab: z.string().max(200).optional(),
})

export const PATCH = route({ params: paramsSchema, body: patchBody }, async ({ db, params, body, audit }) => {
  const patch: Record<string, unknown> = {}
  if (body.name !== undefined) patch.name_enc = encryptField(body.name, 'project_files.name')
  if (body.mapping !== undefined) patch.mapping = body.mapping
  if (body.googleRange !== undefined) patch.google_range = body.googleRange
  if (body.googleTab !== undefined) patch.google_tab = body.googleTab

  if (!Object.keys(patch).length) return { ok: true }

  const { error } = await db.from('project_files').update(patch).eq('id', params.id)
  if (error) throw error
  audit({ action: 'file.update', entity: 'project_file', entityId: params.id })
  return { ok: true }
})

export const DELETE = route({ params: paramsSchema }, async ({ db, params, audit }) => {
  await deleteFile(db, params.id)
  audit({ action: 'file.delete', entity: 'project_file', entityId: params.id })
  return { ok: true }
})
