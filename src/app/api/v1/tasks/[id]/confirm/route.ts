import { route } from '@/server/api/route'
import { ApiError } from '@/server/api/errors'
import { idParam, confirmEdit } from '@/server/api/schemas'
import { tasksRepo } from '@/server/repositories/tasks'

export const POST = route(
  { params: idParam, body: confirmEdit },
  async ({ db, params, body, audit }) => {
    const cur = await tasksRepo.get(db, params.id)
    if (cur.status !== 'draft')
      throw new ApiError(409, 'CONFLICT', 'Só rascunhos podem ser confirmados')
    const t = await tasksRepo.update(db, params.id, { ...(body ?? {}), status: 'confirmed' })
    audit({ action: 'task.confirm', entity: 'task', entityId: t.id })
    return t
  },
)
