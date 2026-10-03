import { z } from 'zod'
import { route } from '@/server/api/route'
import { getUploadUrl } from '@/server/services/upload'

const params = z.object({ id: z.string().uuid() })
const body = z.object({
  name: z.string().min(1).max(150),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
})

export const POST = route({ params, body, status: 201, perMinute: 20 }, async ({ db, params: p, body: b, userId, audit }) => {
  const fileId = crypto.randomUUID()
  const { path, token } = await getUploadUrl(db, userId, p.id, fileId, b.name, b.mimeType, b.size)
  audit({ action: 'file.upload_url', entity: 'project_file', entityId: fileId })
  return { fileId, path, token }
})
