import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/server/api/errors'
import { blindIndex } from '@/server/crypto'
import { enc, dec, keyset, decodeCursor, toPage, newestFirst, type Page } from './_shared'

const T = 'messages'

export type ExtractionStatus = 'pending_extraction' | 'extracted' | 'failed'

export type MessageMeta = {
  id: string
  requesterId: string | null
  source: string
  extractionStatus: ExtractionStatus
  extractionError: string | null
  receivedAt: string
  createdAt: string
}

export type Message = MessageMeta & { content: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta = (r: any): MessageMeta => ({
  id: r.id,
  requesterId: r.requester_id,
  source: r.source,
  extractionStatus: r.extraction_status,
  extractionError: r.extraction_error,
  receivedAt: r.received_at,
  createdAt: r.created_at,
})

export const contentHash = (text: string) => blindIndex(text, 'message.content')

export const messagesRepo = {
  async create(
    db: SupabaseClient,
    i: { content: string; hash: string; requesterId?: string | null; source: string },
  ): Promise<MessageMeta> {
    const { data, error } = await db
      .from(T)
      .insert({
        content_enc: enc(T, 'content', i.content),
        content_hash: i.hash,
        requester_id: i.requesterId ?? null,
        source: i.source,
      })
      .select()
      .single()
    if (error) throw error
    return meta(data)
  },

  async findByHash(db: SupabaseClient, hash: string): Promise<{ id: string } | null> {
    const { data, error } = await db.from(T).select('id').eq('content_hash', hash).maybeSingle()
    if (error) throw error
    return data
  },

  async getMeta(db: SupabaseClient, id: string): Promise<MessageMeta> {
    const { data, error } = await db
      .from(T)
      .select('id,requester_id,source,extraction_status,extraction_error,received_at,created_at')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Mensagem não encontrada')
    return meta(data)
  },

  async getWithContent(db: SupabaseClient, id: string): Promise<Message> {
    const { data, error } = await db.from(T).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Mensagem não encontrada')
    return { ...meta(data), content: dec(T, 'content', data.content_enc) }
  },

  async list(
    db: SupabaseClient,
    f: {
      requesterId?: string
      extractionStatus?: ExtractionStatus
      limit: number
      cursor?: string | null
    },
  ): Promise<Page<MessageMeta>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qAny: any = db
      .from(T)
      .select('id,requester_id,source,extraction_status,extraction_error,received_at,created_at')
    if (f.requesterId) qAny = qAny.eq('requester_id', f.requesterId)
    if (f.extractionStatus) qAny = qAny.eq('extraction_status', f.extractionStatus)
    qAny = keyset(qAny, decodeCursor(f.cursor))
    const { data, error } = await newestFirst(qAny).limit(f.limit + 1)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return toPage(data ?? [], f.limit, (r: any) => meta(r))
  },

  async setStatus(
    db: SupabaseClient,
    id: string,
    status: ExtractionStatus,
    err?: string | null,
  ) {
    const { error: e } = await db
      .from(T)
      .update({ extraction_status: status, extraction_error: err ?? null })
      .eq('id', id)
    if (e) throw e
  },

  async countSince(db: SupabaseClient, iso: string): Promise<number> {
    const { count, error } = await db
      .from(T)
      .select('id', { count: 'exact', head: true })
      .gte('created_at', iso)
    if (error) throw error
    return count ?? 0
  },
}
