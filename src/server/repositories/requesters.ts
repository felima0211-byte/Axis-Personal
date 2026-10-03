import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/server/api/errors'
import { blindIndex } from '@/server/crypto'
import { enc, dec, encN, decN, keyset, decodeCursor, toPage, newestFirst, type Page } from './_shared'

const T = 'requesters'

export type Requester = {
  id: string
  name: string
  notes: string | null
  archivedAt: string | null
  createdAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = (r: any): Requester => ({
  id: r.id,
  name: dec(T, 'name', r.name_enc),
  notes: decN(T, 'notes', r.notes_enc),
  archivedAt: r.archived_at,
  createdAt: r.created_at,
})

const idx = (name: string) => blindIndex(name, 'requester.name')

export const requestersRepo = {
  async create(db: SupabaseClient, i: { name: string; notes?: string | null }): Promise<Requester> {
    const { data, error } = await db
      .from(T)
      .insert({ name_enc: enc(T, 'name', i.name), name_index: idx(i.name), notes_enc: encN(T, 'notes', i.notes) })
      .select()
      .single()
    if (error) throw error
    return map(data)
  },

  async findByName(db: SupabaseClient, name: string): Promise<Requester | null> {
    const { data, error } = await db.from(T).select('*').eq('name_index', idx(name)).maybeSingle()
    if (error) throw error
    return data ? map(data) : null
  },

  async getOrCreateByName(db: SupabaseClient, name: string): Promise<Requester> {
    const found = await requestersRepo.findByName(db, name)
    if (!found) return requestersRepo.create(db, { name })
    if (found.archivedAt) {
      const { data, error } = await db
        .from(T)
        .update({ archived_at: null })
        .eq('id', found.id)
        .select()
        .single()
      if (error) throw error
      return map(data)
    }
    return found
  },

  async get(db: SupabaseClient, id: string): Promise<Requester> {
    const { data, error } = await db.from(T).select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Solicitante não encontrado')
    return map(data)
  },

  async list(
    db: SupabaseClient,
    f: { name?: string; limit: number; cursor?: string | null },
  ): Promise<Page<Requester>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = db.from(T).select('*').is('archived_at', null)
    if (f.name) q = q.eq('name_index', idx(f.name))
    q = keyset(q, decodeCursor(f.cursor))
    const { data, error } = await newestFirst(q).limit(f.limit + 1)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return toPage(data ?? [], f.limit, (r: any) => map(r))
  },

  async listAll(db: SupabaseClient): Promise<Requester[]> {
    const { data, error } = await db.from(T).select('*').is('archived_at', null).limit(2000)
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => map(r))
  },

  async update(
    db: SupabaseClient,
    id: string,
    p: { name?: string; notes?: string | null },
  ): Promise<Requester> {
    const u: Record<string, unknown> = {}
    if (p.name !== undefined) {
      u.name_enc = enc(T, 'name', p.name)
      u.name_index = idx(p.name)
    }
    if (p.notes !== undefined) u.notes_enc = encN(T, 'notes', p.notes)
    if (!Object.keys(u).length) return requestersRepo.get(db, id)
    const { data, error } = await db.from(T).update(u).eq('id', id).select().maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Solicitante não encontrado')
    return map(data)
  },

  async archive(db: SupabaseClient, id: string): Promise<Requester> {
    const { data, error } = await db
      .from(T)
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Solicitante não encontrado')
    return map(data)
  },
}
