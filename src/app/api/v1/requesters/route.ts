import { route } from '@/server/api/route'
import { requesterCreate, requesterListQuery } from '@/server/api/schemas'
import { requestersRepo } from '@/server/repositories/requesters'

export const GET = route({ query: requesterListQuery }, ({ db, query }) =>
  requestersRepo.list(db, { name: query.name, limit: query.limit, cursor: query.cursor }),
)

export const POST = route(
  { body: requesterCreate, status: 201 },
  async ({ db, body, audit }) => {
    const r = await requestersRepo.create(db, body)
    audit({ action: 'requester.create', entity: 'requester', entityId: r.id })
    return r
  },
)
