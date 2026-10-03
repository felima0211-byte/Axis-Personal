import { route } from '@/server/api/route'
import { idParam } from '@/server/api/schemas'
import { remindersRepo } from '@/server/repositories/reminders'

export const POST = route({ params: idParam }, async ({ db, params, audit }) => {
  const r = await remindersRepo.complete(db, params.id)
  audit({ action: 'reminder.complete', entity: 'reminder', entityId: r.id })
  return r
})
