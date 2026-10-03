import { route } from '@/server/api/route'
import { messageListQuery } from '@/server/api/schemas'
import { messagesRepo } from '@/server/repositories/messages'

export const GET = route({ query: messageListQuery }, ({ db, query }) =>
  messagesRepo.list(db, {
    requesterId: query.requester_id,
    extractionStatus: query.extraction_status,
    limit: query.limit,
    cursor: query.cursor,
  }),
)
