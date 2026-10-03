import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { route } from '@/server/api/route'
import { buildAuthUrl, generateCodeVerifier, codeVerifierToChallenge, signState, disconnectGoogle } from '@/server/services/google-oauth'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'
import { ApiError } from '@/server/api/errors'

export const GET = route({ query: z.object({}) }, async ({ db, userId }) => {
  if (!env.GOOGLE_CLIENT_ID) throw new ApiError(422, 'VALIDATION_ERROR', 'Integração Google não configurada')

  const verifier = generateCodeVerifier()
  const challenge = codeVerifierToChallenge(verifier)
  const state = crypto.randomUUID()
  const signedState = signState(state)

  // Store verifier in httpOnly cookie (30 min TTL)
  const cookieStore = await cookies()
  cookieStore.set('google_pkce_verifier', verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 60,
    path: '/',
  })
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 60,
    path: '/',
  })

  const url = buildAuthUrl(signedState, challenge)
  return NextResponse.redirect(url)
})

export const DELETE = route({ query: z.object({}) }, async ({ db, userId, audit }) => {
  await disconnectGoogle(db, userId)
  audit({ action: 'google.disconnect', entity: 'google_connection', entityId: userId })
  return { ok: true }
})
