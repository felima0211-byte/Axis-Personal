import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { encryptJson, decryptJson } from '@/server/crypto'

const T = 'sheet_snapshots'

export type ColumnType = 'text' | 'number' | 'currency_brl' | 'percentage' | 'date' | 'boolean'

export type SheetSnapshot = {
  fileId: string
  headers: string[]
  rows: string[][]
  columnTypes: ColumnType[]
  rowCount: number
  truncated: boolean
  contentHash: string
  syncedAt: string
}

export async function findSnapshot(db: SupabaseClient, fileId: string): Promise<SheetSnapshot | null> {
  const { data } = await db.from(T).select('*').eq('file_id', fileId).maybeSingle()
  if (!data) return null
  return {
    fileId: data.file_id,
    headers: decryptJson<string[]>(data.headers_enc, `sheet_snapshot.${fileId}.headers`),
    rows: decryptJson<string[][]>(data.rows_enc, `sheet_snapshot.${fileId}.rows`),
    columnTypes: data.column_types as ColumnType[],
    rowCount: data.row_count,
    truncated: data.truncated,
    contentHash: data.content_hash,
    syncedAt: data.synced_at,
  }
}

export async function upsertSnapshot(
  db: SupabaseClient,
  userId: string,
  fileId: string,
  snapshot: Omit<SheetSnapshot, 'fileId' | 'syncedAt'>,
): Promise<void> {
  const { error } = await db.from(T).upsert(
    {
      file_id: fileId,
      user_id: userId,
      headers_enc: encryptJson(snapshot.headers, `sheet_snapshot.${fileId}.headers`),
      rows_enc: encryptJson(snapshot.rows, `sheet_snapshot.${fileId}.rows`),
      column_types: snapshot.columnTypes,
      row_count: snapshot.rowCount,
      truncated: snapshot.truncated,
      content_hash: snapshot.contentHash,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'file_id' },
  )
  if (error) throw error
}

export async function deleteSnapshot(db: SupabaseClient, fileId: string): Promise<void> {
  await db.from(T).delete().eq('file_id', fileId)
}
