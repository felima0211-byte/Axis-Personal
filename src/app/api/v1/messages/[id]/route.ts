import { route } from '@/server/api/route'
import { idParam } from '@/server/api/schemas'
import { messagesRepo } from '@/server/repositories/messages'

export const GET = route({ params: idParam }, async ({ db, params, audit }) => {
  const m = await messagesRepo.getWithContent(db, params.id)
  audit({ action: 'message.read', entity: 'message', entityId: m.id })
  return m
})
