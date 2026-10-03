import { route } from '@/server/api/route'
import { ApiError } from '@/server/api/errors'
import { idParam } from '@/server/api/schemas'
import { tasksRepo } from '@/server/repositories/tasks'

export const POST = route({ params: idParam }, async ({ db, params, audit }) => {
  const cur = await tasksRepo.get(db, params.id)
  if (cur.status !== 'draft')
    throw new ApiError(409, 'CONFLICT', 'Só rascunhos podem ser rejeitados')
  const t = await tasksRepo.archive(db, params.id)
  audit({ action: 'task.reject', entity: 'task', entityId: t.id })
  return t
})
