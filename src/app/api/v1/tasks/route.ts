import { route } from '@/server/api/route'
import { taskCreate, taskListQuery } from '@/server/api/schemas'
import { tasksRepo } from '@/server/repositories/tasks'

export const GET = route({ query: taskListQuery }, ({ db, query }) =>
  tasksRepo.list(
    db,
    {
      status: query.status,
      priority: query.priority,
      sectionId: query.section_id,
      requesterId: query.requester_id,
      dueFrom: query.due_from,
      dueTo: query.due_to,
    },
    { limit: query.limit, cursor: query.cursor },
  ),
)

export const POST = route({ body: taskCreate, status: 201 }, async ({ db, body, audit }) => {
  const t = await tasksRepo.create(db, body)
  audit({ action: 'task.create', entity: 'task', entityId: t.id })
  return t
})
