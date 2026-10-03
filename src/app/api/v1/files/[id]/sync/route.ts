import { z } from 'zod'
import { route } from '@/server/api/route'
import { syncSheetFile } from '@/server/services/sheets-sync'

const paramsSchema = z.object({ id: z.string().uuid() })

export const POST = route({ params: paramsSchema, perMinute: 3 }, async ({ db, params, audit }) => {
  await syncSheetFile(db, params.id)
  audit({ action: 'file.sync', entity: 'project_file', entityId: params.id })
  return { ok: true }
})
