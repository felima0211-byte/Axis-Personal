import 'server-only'
import { encryptField, decryptField } from '@/server/crypto'

export const enc = (t: string, c: string, v: string) => encryptField(v, `${t}.${c}`)
export const dec = (t: string, c: string, v: string) => decryptField(v, `${t}.${c}`)
export const encN = (t: string, c: string, v?: string | null) => (v == null ? null : enc(t, c, v))
export const decN = (t: string, c: string, v?: string | null) => (v == null ? null : dec(t, c, v))

export type Page<T> = { items: T[]; nextCursor: string | null }
type Cursor = { t: string; id: string }

const TS = /^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:\d{2})$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString('base64url')
export function decodeCursor(s?: string | null): Cursor | null {
  if (!s) return null
  try {
    const c = JSON.parse(Buffer.from(s, 'base64url').toString('utf8'))
    return typeof c?.t === 'string' &&
      TS.test(c.t) &&
      typeof c?.id === 'string' &&
      UUID.test(c.id)
      ? c
      : null
  } catch {
    return null
  }
}

export function keyset<Q>(q: Q, c: Cursor | null): Q {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return c ? (q as any).or(`created_at.lt."${c.t}",and(created_at.eq."${c.t}",id.lt."${c.id}")`) : q
}

export function toPage<R extends { id: string; created_at: string }, T>(
  rows: R[],
  limit: number,
  map: (r: R) => T,
): Page<T> {
  const more = rows.length > limit
  const slice = more ? rows.slice(0, limit) : rows
  const last = slice[slice.length - 1]
  return {
    items: slice.map(map),
    nextCursor: more && last ? encodeCursor({ t: last.created_at, id: last.id }) : null,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const newestFirst = (q: any) =>
  q.order('created_at', { ascending: false }).order('id', { ascending: false })
