import { route } from '@/server/api/route'
import { idParam } from '@/server/api/schemas'
import { retryExtraction } from '@/server/services/ingest'

export const POST = route(
  { params: idParam, perMinute: 10 },
  async ({ db, params, audit }) => {
    const r = await retryExtraction(db, params.id)
    audit({
      action: 'message.retry_extraction',
      entity: 'message',
      entityId: params.id,
      metadata: { tasks: r.tasks.length, failed: r.extractionFailed },
    })
    return r
  },
)
