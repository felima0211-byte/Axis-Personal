import { route } from '@/server/api/route'
import { env } from '@/lib/env'
import { getToday } from '@/server/services/today'

export const GET = route({}, ({ db }) => getToday(db, env.APP_TIMEZONE))
