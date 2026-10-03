import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enc, dec } from './_shared'

const T = 'google_connections'
export type GoogleStatus = 'active' | 'needs_reconnect' | 'revoked'

export type GoogleConnection = {
  id: string
  userId: string
  googleEmail: string
  scopes: string
  status: GoogleStatus
  lastError: string | null
  connectedAt: string
  updatedAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toConnection(r: any): GoogleConnection {
  return {
    id: r.id,
    userId: r.user_id,
    googleEmail: dec(T, 'google_email', r.google_email_enc),
    scopes: r.scopes,
    status: r.status as GoogleStatus,
    lastError: r.last_error ?? null,
    connectedAt: r.connected_at,
    updatedAt: r.updated_at,
  }
}

export async function findConnectionByUser(db: SupabaseClient, userId: string): Promise<GoogleConnection | null> {
  const { data } = await db.from(T).select('*').eq('user_id', userId).maybeSingle()
  return data ? toConnection(data) : null
}

export async function upsertConnection(
  db: SupabaseClient,
  userId: string,
  params: { googleEmail: string; refreshTokenEnc: string; scopes: string },
): Promise<GoogleConnection> {
  const { data, error } = await db
    .from(T)
    .upsert(
      {
        user_id: userId,
        google_email_enc: enc(T, 'google_email', params.googleEmail),
        refresh_token_enc: params.refreshTokenEnc,
        scopes: params.scopes,
        status: 'active',
        last_error: null,
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single()
  if (error) throw error
  return toConnection(data)
}

export async function markNeedsReconnect(db: SupabaseClient, userId: string, errorMsg: string): Promise<void> {
  await db.from(T).update({ status: 'needs_reconnect', last_error: errorMsg.slice(0, 200) }).eq('user_id', userId)
}

export async function getRefreshTokenEnc(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await db.from(T).select('refresh_token_enc').eq('user_id', userId).maybeSingle()
  return data?.refresh_token_enc ?? null
}

export async function deleteConnection(db: SupabaseClient, userId: string): Promise<void> {
  await db.from(T).delete().eq('user_id', userId)
}
