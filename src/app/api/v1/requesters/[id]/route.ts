import { route } from '@/server/api/route'
import { idParam, requesterPatch } from '@/server/api/schemas'
import { requestersRepo } from '@/server/repositories/requesters'

export const GET = route({ params: idParam }, ({ db, params }) =>
  requestersRepo.get(db, params.id),
)

export const PATCH = route(
  { params: idParam, body: requesterPatch },
  async ({ db, params, body, audit }) => {
    const r = await requestersRepo.update(db, params.id, body)
    audit({ action: 'requester.update', entity: 'requester', entityId: r.id })
    return r
  },
)

export const DELETE = route({ params: idParam }, async ({ db, params, audit }) => {
  const r = await requestersRepo.archive(db, params.id)
  audit({ action: 'requester.archive', entity: 'requester', entityId: r.id })
  return r
})
