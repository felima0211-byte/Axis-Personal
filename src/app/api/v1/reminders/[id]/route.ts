import { route } from '@/server/api/route'
import { idParam, reminderPatch } from '@/server/api/schemas'
import { remindersRepo } from '@/server/repositories/reminders'

export const GET = route({ params: idParam }, ({ db, params }) =>
  remindersRepo.get(db, params.id),
)

export const PATCH = route(
  { params: idParam, body: reminderPatch },
  async ({ db, params, body, audit }) => {
    const r = await remindersRepo.update(db, params.id, body)
    audit({ action: 'reminder.update', entity: 'reminder', entityId: r.id })
    return r
  },
)

export const DELETE = route({ params: idParam }, async ({ db, params, audit }) => {
  await remindersRepo.remove(db, params.id)
  audit({ action: 'reminder.delete', entity: 'reminder', entityId: params.id })
  return { ok: true }
})
