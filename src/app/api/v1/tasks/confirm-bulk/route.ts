import { route } from '@/server/api/route'
import { ApiError } from '@/server/api/errors'
import { confirmBulk } from '@/server/api/schemas'
import { tasksRepo } from '@/server/repositories/tasks'

export const POST = route({ body: confirmBulk }, async ({ db, body, audit }) => {
  const confirmed: string[] = []
  const skipped: string[] = []

  for (const id of body.ids) {
    try {
      const cur = await tasksRepo.get(db, id)
      if (cur.status !== 'draft') {
        skipped.push(id)
        continue
      }
      await tasksRepo.update(db, id, { status: 'confirmed' })
      confirmed.push(id)
    } catch (e) {
      if (e instanceof ApiError) skipped.push(id)
      else throw e
    }
  }

  audit({
    action: 'task.confirm_bulk',
    entity: 'task',
    metadata: { confirmed: confirmed.length, skipped: skipped.length },
  })
  return { confirmed, skipped }
})
