/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { env } from '@/lib/env'
import { refreshAccessToken } from './google-oauth'
import { markNeedsReconnect } from '@/server/repositories/google-connections'
import { upsertSnapshot, findSnapshot, type ColumnType } from '@/server/repositories/sheet-snapshots'

// In-memory lock to prevent concurrent sync of same file
const syncLocks = new Set<string>()

const BRL_RE = /^R\$\s?[\d.,]+$/
const PCT_RE = /^-?[\d.,]+\s?%$/
const DATE_RE = /^\d{2}\/\d{2}\/\d{4}$/
const NUM_RE = /^-?[\d.,]+$/
const BOOL_RE = /^(sim|não|nao|true|false|s|n)$/i

export function inferColumnType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => v.trim() !== '')
  if (nonEmpty.length === 0) return 'text'

  const scores: Record<ColumnType, number> = {
    currency_brl: 0, percentage: 0, date: 0, boolean: 0, number: 0, text: 0,
  }

  for (const v of nonEmpty) {
    const t = v.trim()
    if (BRL_RE.test(t)) scores.currency_brl++
    else if (PCT_RE.test(t)) scores.percentage++
    else if (DATE_RE.test(t)) scores.date++
    else if (BOOL_RE.test(t)) scores.boolean++
    else if (NUM_RE.test(t)) scores.number++
    else scores.text++
  }

  const dominant = (Object.keys(scores) as ColumnType[]).sort((a, b) => scores[b] - scores[a])[0]
  const ratio = scores[dominant] / nonEmpty.length
  return ratio >= 0.7 ? dominant : 'text'
}

export function inferColumnTypes(headers: string[], rows: string[][]): ColumnType[] {
  return headers.map((_, colIdx) => {
    const colValues = rows.map((r) => r[colIdx] ?? '')
    return inferColumnType(colValues)
  })
}

async function fetchSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
): Promise<{ values: string[][] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })

  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 5000))
    const retry = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!retry.ok) throw Object.assign(new Error('Google Sheets rate limit'), { status: retry.status })
    return retry.json()
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error(body.error?.message ?? `HTTP ${res.status}`), { status: res.status })
  }

  return res.json()
}

export async function syncSheetFile(db: SupabaseClient, fileId: string): Promise<void> {
  if (syncLocks.has(fileId)) return
  syncLocks.add(fileId)

  try {
    const { data: file } = await db
      .from('project_files')
      .select('id,user_id,project_id,google_sheet_id,google_range,google_tab')
      .eq('id', fileId)
      .eq('kind', 'google_sheet')
      .single()

    if (!file) return

    await db.from('project_files').update({ sync_status: 'syncing' }).eq('id', fileId)

    let accessToken: string
    try {
      accessToken = await refreshAccessToken(db, file.user_id)
    } catch (err: any) {
      if (err?.message?.includes('invalid_grant')) {
        await markNeedsReconnect(db, file.user_id, 'invalid_grant')
        await db.from('project_files').update({ sync_status: 'disconnected', last_error: 'Conexão Google expirada. Reconecte.' }).eq('id', fileId)
      } else {
        await db.from('project_files').update({ sync_status: 'error', last_error: String(err?.message ?? 'Erro de token').slice(0, 200) }).eq('id', fileId)
      }
      return
    }

    const maxRows = env.SHEETS_MAX_ROWS ?? 5000
    const maxCols = env.SHEETS_MAX_COLS ?? 30
    const range = file.google_range ?? (file.google_tab ? `${file.google_tab}!A1:${columnLetter(maxCols)}${maxRows + 1}` : `A1:${columnLetter(maxCols)}${maxRows + 1}`)

    let rawValues: string[][]
    try {
      const result = await fetchSheetValues(accessToken, file.google_sheet_id, range)
      rawValues = (result.values ?? []).map((r: any[]) => r.map(String))
    } catch (err: any) {
      await db.from('project_files').update({ sync_status: 'error', last_error: String(err?.message ?? 'Erro ao buscar planilha').slice(0, 200) }).eq('id', fileId)
      return
    }

    // Remove empty rows/cols, find headers
    const nonEmpty = rawValues.filter((r) => r.some((c) => c.trim() !== ''))
    if (nonEmpty.length === 0) {
      await db.from('project_files').update({ sync_status: 'synced' }).eq('id', fileId)
      return
    }

    const headers = nonEmpty[0]
    const dataRows = nonEmpty.slice(1, maxRows + 1)
    const truncated = nonEmpty.length > maxRows + 1

    const contentHash = createHash('sha256')
      .update(JSON.stringify(headers) + JSON.stringify(dataRows.slice(0, 50)))
      .digest('hex')

    const existing = await findSnapshot(db, fileId)
    if (existing?.contentHash === contentHash) {
      await db.from('project_files').update({ sync_status: 'synced' }).eq('id', fileId)
      return
    }

    const columnTypes = inferColumnTypes(headers, dataRows)
    await upsertSnapshot(db, file.user_id, fileId, {
      headers,
      rows: dataRows,
      columnTypes,
      rowCount: dataRows.length,
      truncated,
      contentHash,
    })

    await db.from('project_files').update({ sync_status: 'synced', last_error: null }).eq('id', fileId)
  } catch (err: any) {
    await db
      .from('project_files')
      .update({ sync_status: 'error', last_error: String(err?.message ?? 'Erro desconhecido').slice(0, 200) })
      .eq('id', fileId)
  } finally {
    syncLocks.delete(fileId)
  }
}

export async function syncAllSheets(db: SupabaseClient): Promise<void> {
  const { data: files } = await db
    .from('project_files')
    .select('id')
    .eq('kind', 'google_sheet')
    .neq('sync_status', 'disconnected')

  for (const f of files ?? []) {
    try {
      await syncSheetFile(db, f.id)
    } catch {}
  }
}

export async function deleteOrphanUploads(db: SupabaseClient, userId: string): Promise<void> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: objs } = await (db.storage as any)
    .from('project-files')
    .list(userId, { sortBy: { column: 'created_at', order: 'asc' } })

  if (!objs) return

  for (const bucket of objs ?? []) {
    const { data: children } = await (db.storage as any)
      .from('project-files')
      .list(`${userId}/${bucket.name}`)

    for (const obj of children ?? []) {
      if (obj.created_at > hourAgo) continue
      const fileId = obj.name
      const { data: row } = await db.from('project_files').select('id').eq('id', fileId).maybeSingle()
      if (!row) {
        await (db.storage as any).from('project-files').remove([`${userId}/${bucket.name}/${obj.name}`])
      }
    }
  }
}

function columnLetter(n: number): string {
  let s = ''
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}
