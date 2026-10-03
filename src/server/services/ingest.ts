import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { ApiError } from '@/server/api/errors'
import { extractTasks, ExtractionError } from '@/server/ai/extract-tasks'
import { localYmd, startOfDay } from '@/server/time'
import { messagesRepo, contentHash, type MessageMeta } from '@/server/repositories/messages'
import { requestersRepo } from '@/server/repositories/requesters'
import { sectionsRepo } from '@/server/repositories/sections'
import { tasksRepo, type Task } from '@/server/repositories/tasks'

export type IngestInput = {
  text: string
  requesterId?: string
  requesterName?: string
  sectionId?: string
  source: 'pasted' | 'whatsapp' | 'email' | 'other'
}

export type IngestResult = {
  message: MessageMeta
  tasks: Task[]
  extractionFailed: boolean
  retryUrl?: string
}

export async function ingestConversation(
  db: SupabaseClient,
  i: IngestInput,
): Promise<IngestResult> {
  const hash = contentHash(i.text)
  const existing = await messagesRepo.findByHash(db, hash)
  if (existing) throw new ApiError(409, 'CONFLICT', 'Conversa já registrada', { messageId: existing.id })

  const dayStart = startOfDay(
    localYmd(new Date(), env.APP_TIMEZONE),
    env.APP_TIMEZONE,
  ).toISOString()
  if ((await messagesRepo.countSince(db, dayStart)) >= env.INGEST_DAILY_LIMIT) {
    throw new ApiError(429, 'RATE_LIMITED', 'Limite diário de ingestões atingido', {
      reason: 'daily_limit',
    })
  }

  let requesterId: string | null = null
  if (i.requesterId) requesterId = (await requestersRepo.get(db, i.requesterId)).id
  else if (i.requesterName)
    requesterId = (await requestersRepo.getOrCreateByName(db, i.requesterName)).id

  const message = await messagesRepo.create(db, {
    content: i.text,
    hash,
    requesterId,
    source: i.source,
  })

  return runExtraction(db, message.id, i.sectionId)
}

export async function runExtraction(
  db: SupabaseClient,
  messageId: string,
  defaultSectionId?: string,
): Promise<IngestResult> {
  const msg = await messagesRepo.getWithContent(db, messageId)
  const retryUrl = `/api/v1/messages/${messageId}/retry-extraction`

  const already = await tasksRepo.listAll(db, { messageId })
  if (already.length) {
    await messagesRepo.setStatus(db, messageId, 'extracted')
    return {
      message: await messagesRepo.getMeta(db, messageId),
      tasks: already,
      extractionFailed: false,
    }
  }

  const sections = await sectionsRepo.list(db)
  let extracted
  try {
    extracted = await extractTasks({
      text: msg.content,
      sectionNames: sections.map((s) => s.name),
      tz: env.APP_TIMEZONE,
    })
  } catch (e) {
    await messagesRepo.setStatus(
      db,
      messageId,
      'failed',
      e instanceof ExtractionError ? 'invalid_response' : 'api_error',
    )
    return {
      message: await messagesRepo.getMeta(db, messageId),
      tasks: [],
      extractionFailed: true,
      retryUrl,
    }
  }

  const byName = new Map(sections.map((s) => [s.name.toLowerCase(), s.id]))
  const nameCache = new Map<string, string>()
  const tasks: Task[] = []

  for (const t of extracted) {
    let requesterId = msg.requesterId
    if (
      !requesterId &&
      t.requester_name &&
      (nameCache.size < 5 || nameCache.has(t.requester_name))
    ) {
      if (!nameCache.has(t.requester_name)) {
        nameCache.set(
          t.requester_name,
          (await requestersRepo.getOrCreateByName(db, t.requester_name)).id,
        )
      }
      requesterId = nameCache.get(t.requester_name)!
    }
    tasks.push(
      await tasksRepo.create(db, {
        title: t.title,
        description: t.description,
        sourceExcerpt: t.source_excerpt,
        sectionId:
          (t.suggested_section && byName.get(t.suggested_section.toLowerCase())) ||
          defaultSectionId ||
          null,
        requesterId,
        messageId,
        priority: t.priority,
        dueAt: t.due_at ?? null,
        aiConfidence: t.confidence,
        status: 'draft',
      }),
    )
  }

  await messagesRepo.setStatus(db, messageId, 'extracted')
  return {
    message: await messagesRepo.getMeta(db, messageId),
    tasks,
    extractionFailed: false,
  }
}

export async function retryExtraction(
  db: SupabaseClient,
  messageId: string,
): Promise<IngestResult> {
  const meta = await messagesRepo.getMeta(db, messageId)
  if (meta.extractionStatus === 'extracted')
    throw new ApiError(409, 'CONFLICT', 'Mensagem já processada')
  return runExtraction(db, messageId)
}
