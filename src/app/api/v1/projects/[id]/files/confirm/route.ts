import { z } from 'zod'
import { route } from '@/server/api/route'
import { confirmUpload } from '@/server/services/upload'

const params = z.object({ id: z.string().uuid() })
const body = z.object({
  fileId: z.string().uuid(),
  name: z.string().min(1).max(150),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
})

export const POST = route({ params, body, status: 201 }, async ({ db, params: p, body: b, userId, audit }) => {
  await confirmUpload(db, userId, p.id, b.fileId, b.name, b.mimeType, b.size)
  audit({ action: 'file.confirm', entity: 'project_file', entityId: b.fileId })
  return { ok: true }
})
