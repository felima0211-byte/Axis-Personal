import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyState, exchangeCode } from '@/server/services/google-oauth'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code')
  const signedState = searchParams.get('state')

  if (!code || !signedState) {
    return NextResponse.redirect(new URL('/dashboard/configuracoes?google_error=missing_params', req.url))
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('google_oauth_state')?.value
  const codeVerifier = cookieStore.get('google_pkce_verifier')?.value

  if (!storedState || !codeVerifier) {
    return NextResponse.redirect(new URL('/dashboard/configuracoes?google_error=missing_cookies', req.url))
  }

  const extractedState = verifyState(signedState)
  if (!extractedState || extractedState !== storedState) {
    return NextResponse.redirect(new URL('/dashboard/configuracoes?google_error=invalid_state', req.url))
  }

  cookieStore.delete('google_oauth_state')
  cookieStore.delete('google_pkce_verifier')

  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', req.url))

    await exchangeCode(db, user.id, code, codeVerifier)
    return NextResponse.redirect(new URL('/dashboard/configuracoes?google_connected=1', req.url))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.slice(0, 100) : 'unknown'
    return NextResponse.redirect(new URL(`/dashboard/configuracoes?google_error=${encodeURIComponent(msg)}`, req.url))
  }
}
