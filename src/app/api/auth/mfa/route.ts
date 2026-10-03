import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { factorId, challengeId, code } = body as {
    factorId: string
    challengeId?: string
    code: string
  }

  const supabase = await createSupabaseServerClient()

  // If no challengeId provided, create a new challenge (enrollment flow)
  let resolvedChallengeId = challengeId
  if (!resolvedChallengeId) {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId })
    if (error || !data) {
      return NextResponse.json({ error: 'Erro ao criar desafio MFA.' }, { status: 500 })
    }
    resolvedChallengeId = data.id
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: resolvedChallengeId,
    code,
  })

  if (error) {
    return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 401 })
  }

  return NextResponse.json({ ok: true })
}
