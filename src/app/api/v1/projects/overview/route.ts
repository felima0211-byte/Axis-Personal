import { z } from 'zod'
import { route } from '@/server/api/route'
import { getProjectsOverview } from '@/server/repositories/projects'

export const GET = route({ query: z.object({}) }, async ({ db }) => {
  return getProjectsOverview(db)
})
