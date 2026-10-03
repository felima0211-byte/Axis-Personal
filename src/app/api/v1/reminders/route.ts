import { route } from '@/server/api/route'
import { reminderCreate, reminderListQuery } from '@/server/api/schemas'
import { remindersRepo } from '@/server/repositories/reminders'

export const GET = route({ query: reminderListQuery }, ({ db, query }) =>
  remindersRepo.list(
    db,
    {
      remindFrom: query.remind_from,
      remindTo: query.remind_to,
      includeDone: query.include_done,
    },
    { limit: query.limit, cursor: query.cursor },
  ),
)

export const POST = route({ body: reminderCreate, status: 201 }, async ({ db, body, audit }) => {
  const r = await remindersRepo.create(db, body)
  audit({ action: 'reminder.create', entity: 'reminder', entityId: r.id })
  return r
})
