import { route } from '@/server/api/route'
import { upcomingQuery } from '@/server/api/schemas'
import { env } from '@/lib/env'
import { getUpcoming } from '@/server/services/today'

export const GET = route({ query: upcomingQuery }, ({ db, query }) =>
  getUpcoming(db, env.APP_TIMEZONE, query.until),
)
