import { z } from 'zod'
import { route } from '@/server/api/route'
import { getDownloadUrl } from '@/server/services/upload'

const paramsSchema = z.object({ id: z.string().uuid() })

export const GET = route({ params: paramsSchema }, async ({ db, params, audit }) => {
  const url = await getDownloadUrl(db, params.id)
  audit({ action: 'file.download', entity: 'project_file', entityId: params.id })
  return { url }
})
