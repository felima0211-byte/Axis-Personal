/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ApiError } from '@/server/api/errors'
import { env } from '@/lib/env'
import { encryptField, decryptField } from '@/server/crypto'

const T = 'project_files'

const ALLOWED_TYPES: Record<string, string[]> = {
  'application/pdf': ['pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'text/csv': ['csv'],
  'text/plain': ['txt'],
  'text/markdown': ['md'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
}

function sanitizeName(name: string): string {
  return name
    .replace(/[/\\]/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .slice(0, 150)
    .trim()
}

function validateFile(name: string, mimeType: string, sizeBytes: number): void {
  const maxMb = env.UPLOAD_MAX_MB ?? 25
  if (sizeBytes > maxMb * 1024 * 1024) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', `Arquivo muito grande. Máximo: ${maxMb} MB`)
  }
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const allowedExts = ALLOWED_TYPES[mimeType]
  if (!allowedExts || !allowedExts.includes(ext)) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Tipo de arquivo não permitido')
  }
}

export async function getUploadUrl(
  db: SupabaseClient,
  userId: string,
  projectId: string,
  fileId: string,
  name: string,
  mimeType: string,
  sizeBytes: number,
): Promise<{ path: string; token: string }> {
  validateFile(name, mimeType, sizeBytes)
  const path = `${userId}/${projectId}/${fileId}`
  const { data, error } = await (db.storage as any).from('project-files').createSignedUploadUrl(path)
  if (error) throw new ApiError(500, 'INTERNAL', 'Erro ao gerar URL de upload')
  return { path, token: data.token }
}

export async function confirmUpload(
  db: SupabaseClient,
  userId: string,
  projectId: string,
  fileId: string,
  name: string,
  mimeType: string,
  sizeBytes: number,
): Promise<void> {
  validateFile(name, mimeType, sizeBytes)
  const path = `${userId}/${projectId}/${fileId}`

  // Verify object exists in Storage
  const { data: objData } = await (db.storage as any).from('project-files').list(`${userId}/${projectId}`, {
    search: fileId,
  })
  const obj = Array.isArray(objData) ? objData.find((o: any) => o.name === fileId) : null
  if (!obj) throw new ApiError(404, 'NOT_FOUND', 'Arquivo não encontrado no storage')

  const safe = sanitizeName(name)
  const { error } = await db.from(T).insert({
    id: fileId,
    user_id: userId,
    project_id: projectId,
    name_enc: encryptField(safe, `${T}.name`),
    kind: 'upload',
    mime_type: mimeType,
    size_bytes: sizeBytes,
    storage_path: path,
    sync_status: 'idle',
  })
  if (error) throw error
}

export async function getDownloadUrl(db: SupabaseClient, fileId: string): Promise<string> {
  const { data: row } = await db.from(T).select('storage_path').eq('id', fileId).single()
  if (!row?.storage_path) throw new ApiError(404, 'NOT_FOUND', 'Arquivo não encontrado')

  const { data, error } = await (db.storage as any)
    .from('project-files')
    .createSignedUrl(row.storage_path, 60, { download: true })
  if (error) throw new ApiError(500, 'INTERNAL', 'Erro ao gerar URL de download')
  return data.signedUrl
}

export async function deleteFile(db: SupabaseClient, fileId: string): Promise<void> {
  const { data: row } = await db.from(T).select('storage_path,kind').eq('id', fileId).single()
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Arquivo não encontrado')

  if (row.kind === 'upload' && row.storage_path) {
    await (db.storage as any).from('project-files').remove([row.storage_path])
  }

  const { error } = await db.from(T).delete().eq('id', fileId)
  if (error) throw error
}

export function decryptFileName(nameEnc: string): string {
  return decryptField(nameEnc, `${T}.name`)
}

export async function listProjectFiles(
  db: SupabaseClient,
  projectId: string,
): Promise<{
  id: string; name: string; kind: string; mimeType: string | null; sizeBytes: number | null;
  syncStatus: string; lastError: string | null; googleSheetId: string | null; createdAt: string; updatedAt: string
}[]> {
  const { data, error } = await db.from(T).select('*').eq('project_id', projectId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: decryptFileName(r.name_enc),
    kind: r.kind,
    mimeType: r.mime_type ?? null,
    sizeBytes: r.size_bytes ?? null,
    syncStatus: r.sync_status,
    lastError: r.last_error ?? null,
    googleSheetId: r.google_sheet_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}
