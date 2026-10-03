import { z } from 'zod'
import { route } from '@/server/api/route'
import { findConnectionByUser } from '@/server/repositories/google-connections'

export const GET = route({ query: z.object({}) }, async ({ db, userId }) => {
  const conn = await findConnectionByUser(db, userId)
  if (!conn) return null
  return {
    id: conn.id,
    googleEmail: conn.googleEmail,
    status: conn.status,
    connectedAt: conn.connectedAt,
  }
})
