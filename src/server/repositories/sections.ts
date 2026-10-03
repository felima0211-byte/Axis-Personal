import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/server/api/errors'

export type Section = {
  id: string
  name: string
  slug: string
  kind: 'general' | 'spreadsheet'
  color: string
  sortOrder: number
  archivedAt: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = (r: any): Section => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  kind: r.kind,
  color: r.color,
  sortOrder: r.sort_order,
  archivedAt: r.archived_at,
})

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'secao'

export type SectionInput = {
  name: string
  color?: string
  kind?: 'general' | 'spreadsheet'
  sortOrder?: number
}

export const sectionsRepo = {
  async list(db: SupabaseClient, includeArchived = false): Promise<Section[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = db.from('sections').select('*').order('sort_order').order('name')
    if (!includeArchived) q = q.is('archived_at', null)
    const { data, error } = await q
    if (error) throw error
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => map(r))
  },

  async get(db: SupabaseClient, id: string): Promise<Section> {
    const { data, error } = await db.from('sections').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Seção não encontrada')
    return map(data)
  },

  async create(db: SupabaseClient, i: SectionInput): Promise<Section> {
    const base = slugify(i.name)
    for (let n = 0; n < 5; n++) {
      const slug = n === 0 ? base : `${base}-${n + 1}`
      const { data, error } = await db
        .from('sections')
        .insert({ name: i.name, slug, color: i.color, kind: i.kind, sort_order: i.sortOrder })
        .select()
        .single()
      if (!error) return map(data)
      if ((error as { code?: string }).code !== '23505') throw error
    }
    throw new ApiError(409, 'CONFLICT', 'Não foi possível gerar um identificador único')
  },

  async update(
    db: SupabaseClient,
    id: string,
    p: Partial<SectionInput> & { archived?: boolean },
  ): Promise<Section> {
    const u: Record<string, unknown> = {}
    if (p.name !== undefined) u.name = p.name
    if (p.color !== undefined) u.color = p.color
    if (p.kind !== undefined) u.kind = p.kind
    if (p.sortOrder !== undefined) u.sort_order = p.sortOrder
    if (p.archived !== undefined) u.archived_at = p.archived ? new Date().toISOString() : null
    if (!Object.keys(u).length) return sectionsRepo.get(db, id)
    const { data, error } = await db
      .from('sections')
      .update(u)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new ApiError(404, 'NOT_FOUND', 'Seção não encontrada')
    return map(data)
  },

  archive: (db: SupabaseClient, id: string) => sectionsRepo.update(db, id, { archived: true }),
}
