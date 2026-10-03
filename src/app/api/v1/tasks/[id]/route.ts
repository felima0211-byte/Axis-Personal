import { route } from '@/server/api/route'
import { idParam, taskPatch } from '@/server/api/schemas'
import { tasksRepo } from '@/server/repositories/tasks'

export const GET = route({ params: idParam }, ({ db, params }) => tasksRepo.get(db, params.id))

export const PATCH = route(
  { params: idParam, body: taskPatch },
  async ({ db, params, body, audit }) => {
    const t = await tasksRepo.update(db, params.id, body)
    audit({
      action: 'task.update',
      entity: 'task',
      entityId: t.id,
      metadata: { status: t.status },
    })
    return t
  },
)

export const DELETE = route({ params: idParam }, async ({ db, params, audit }) => {
  const t = await tasksRepo.archive(db, params.id)
  audit({ action: 'task.archive', entity: 'task', entityId: t.id })
  return t
})
