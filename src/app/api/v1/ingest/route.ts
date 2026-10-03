import { route } from '@/server/api/route'
import { ingestBody } from '@/server/api/schemas'
import { ingestConversation } from '@/server/services/ingest'

export const POST = route(
  { body: ingestBody, status: 201, perMinute: 10 },
  async ({ db, body, audit }) => {
    const r = await ingestConversation(db, body)
    audit({
      action: 'message.ingest',
      entity: 'message',
      entityId: r.message.id,
      metadata: { tasks: r.tasks.length, failed: r.extractionFailed },
    })
    return r
  },
)
