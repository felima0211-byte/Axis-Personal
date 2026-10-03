import { z } from 'zod'
import { route } from '@/server/api/route'
import { ApiError } from '@/server/api/errors'
import { encryptField } from '@/server/crypto'
import { syncSheetFile } from '@/server/services/sheets-sync'
import { refreshAccessToken } from '@/server/services/google-oauth'
import { env } from '@/lib/env'

const params = z.object({ id: z.string().uuid() })
const body = z.object({
  urlOrId: z.string().min(1).max(500),
  tab: z.string().max(200).optional(),
  range: z.string().max(100).optional(),
})

function extractSpreadsheetId(urlOrId: string): string {
  const m = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  if (/^[a-zA-Z0-9_-]{20,}$/.test(urlOrId)) return urlOrId
  throw new ApiError(422, 'VALIDATION_ERROR', 'URL ou ID de planilha inválido')
}

export const POST = route({ params, body, status: 201 }, async ({ db, params: p, body: b, userId, audit }) => {
  if (!env.GOOGLE_CLIENT_ID) throw new ApiError(422, 'VALIDATION_ERROR', 'Integração Google não configurada')

  const spreadsheetId = extractSpreadsheetId(b.urlOrId)

  // Fetch spreadsheet title using access token
  let title = spreadsheetId
  try {
    const accessToken = await refreshAccessToken(db, userId)
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (res.ok) {
      const data = await res.json()
      title = data.properties?.title ?? spreadsheetId
    }
  } catch {}

  const fileId = crypto.randomUUID()
  const { error } = await db.from('project_files').insert({
    id: fileId,
    user_id: userId,
    project_id: p.id,
    name_enc: encryptField(title, 'project_files.name'),
    kind: 'google_sheet',
    google_sheet_id: spreadsheetId,
    google_tab: b.tab ?? null,
    google_range: b.range ?? null,
    sync_status: 'idle',
  })
  if (error) throw error

  audit({ action: 'file.link_sheet', entity: 'project_file', entityId: fileId })

  // Kick off first sync in background (best-effort)
  syncSheetFile(db, fileId).catch(() => {})

  return { fileId }
})
