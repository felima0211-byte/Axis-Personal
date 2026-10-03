import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkLoginRateLimit } from '@/lib/rate-limit'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const body = await request.json()
  const { email, password } = body as { email: string; password: string }

  // Rate limit: 5 attempts per 15 min per IP+email combo
  const rl = await checkLoginRateLimit(ip, email)
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em breve.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) },
      }
    )
  }

  // Allowlist check before even hitting Supabase
  if (email !== env.OWNER_EMAIL) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 })
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
  }

  // Check if user has MFA enrolled
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const totpFactor = factors?.totp?.find((f) => f.status === 'verified')

  if (!totpFactor) {
    // First login: enroll MFA
    const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'Axis Personal',
    })
    if (enrollError || !enrollData) {
      return NextResponse.json({ error: 'Erro ao configurar MFA.' }, { status: 500 })
    }
    return NextResponse.json({
      requiresMfa: true,
      factorId: enrollData.id,
      qrCode: enrollData.totp.qr_code,
      secret: enrollData.totp.secret,
      isEnrollment: true,
    })
  }

  // MFA enrolled, challenge required
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: totpFactor.id,
  })
  if (challengeError || !challengeData) {
    return NextResponse.json({ error: 'Erro ao iniciar desafio MFA.' }, { status: 500 })
  }

  return NextResponse.json({
    requiresMfa: true,
    factorId: totpFactor.id,
    challengeId: challengeData.id,
  })
}
