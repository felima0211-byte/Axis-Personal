import { z } from 'zod'
import { route } from '@/server/api/route'
import { listProjectFiles } from '@/server/services/upload'

const paramsSchema = z.object({ id: z.string().uuid() })

export const GET = route({ params: paramsSchema }, async ({ db, params }) => {
  const files = await listProjectFiles(db, params.id)
  return { items: files, nextCursor: null }
})
