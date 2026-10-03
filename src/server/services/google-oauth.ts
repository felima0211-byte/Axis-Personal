import 'server-only'
import { env } from '@/lib/env'
import { encryptField, decryptField } from '@/server/crypto'
import { createHash, createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import { upsertConnection, markNeedsReconnect, getRefreshTokenEnc, deleteConnection } from '@/server/repositories/google-connections'
import type { SupabaseClient } from '@supabase/supabase-js'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

function getClientId(): string {
  const id = env.GOOGLE_CLIENT_ID
  if (!id) throw new Error('GOOGLE_CLIENT_ID não configurado')
  return id
}

function getClientSecret(): string {
  const s = env.GOOGLE_CLIENT_SECRET
  if (!s) throw new Error('GOOGLE_CLIENT_SECRET não configurado')
  return s
}

function getRedirectUri(): string {
  const u = env.GOOGLE_REDIRECT_URI
  if (!u) throw new Error('GOOGLE_REDIRECT_URI não configurado')
  return u
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url')
}

export function codeVerifierToChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function signState(state: string): string {
  const secret = process.env.BLIND_INDEX_KEY ?? 'dev-state-secret'
  const mac = createHmac('sha256', Buffer.from(secret, 'base64')).update(state).digest('base64url')
  return `${state}.${mac}`
}

export function verifyState(signed: string): string | null {
  const lastDot = signed.lastIndexOf('.')
  if (lastDot < 0) return null
  const state = signed.slice(0, lastDot)
  const expected = signState(state)
  try {
    const a = Buffer.from(signed)
    const b = Buffer.from(expected)
    if (a.length !== b.length) return null
    if (!timingSafeEqual(a, b)) return null
    return state
  } catch {
    return null
  }
}

export function buildAuthUrl(signedState: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: signedState,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCode(
  db: SupabaseClient,
  userId: string,
  code: string,
  codeVerifier: string,
): Promise<void> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  })
  const data: Record<string, string> = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'OAuth exchange failed')

  const refreshToken: string = data.refresh_token
  if (!refreshToken) throw new Error('No refresh token received — ensure access_type=offline and prompt=consent')

  // Get email from id_token claims (base64 decode middle segment)
  let googleEmail = 'unknown@google.com'
  if (data.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(data.id_token.split('.')[1], 'base64url').toString())
      googleEmail = payload.email ?? googleEmail
    } catch {}
  }

  const refreshTokenEnc = encryptField(refreshToken, 'google_connection.refresh_token')
  await upsertConnection(db, userId, { googleEmail, refreshTokenEnc, scopes: SCOPES.join(' ') })
}

export async function refreshAccessToken(db: SupabaseClient, userId: string): Promise<string> {
  const enc = await getRefreshTokenEnc(db, userId)
  if (!enc) throw new Error('No connection found')

  const refreshToken = decryptField(enc, 'google_connection.refresh_token')

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      grant_type: 'refresh_token',
    }),
  })
  const data: Record<string, string> = await res.json()

  if (!res.ok) {
    if (data.error === 'invalid_grant') {
      await markNeedsReconnect(db, userId, 'invalid_grant — reconecte sua conta Google')
    }
    throw new Error(data.error ?? 'Token refresh failed')
  }

  return data.access_token
}

export async function revokeToken(accessToken: string): Promise<void> {
  await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(accessToken)}`, { method: 'POST' })
}

export async function disconnectGoogle(db: SupabaseClient, userId: string): Promise<void> {
  try {
    const accessToken = await refreshAccessToken(db, userId)
    await revokeToken(accessToken)
  } catch {
    // Best-effort revocation
  }
  await deleteConnection(db, userId)
  // Mark associated google_sheet files as disconnected
  await db.from('project_files').update({ sync_status: 'disconnected' }).eq('user_id', userId).eq('kind', 'google_sheet')
}
