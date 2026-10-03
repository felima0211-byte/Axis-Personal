'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Image from 'next/image'

type Step = 'credentials' | 'mfa-enroll' | 'mfa-verify'

interface LoginState {
  step: Step
  factorId: string | null
  challengeId?: string
  qrCode?: string
  secret?: string
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<LoginState>({ step: 'credentials', factorId: null })

  const unauthorized = params.get('unauthorized') === '1'
  const mfaRequired = params.get('mfa_required') === '1'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao fazer login'); return }
      if (data.requiresMfa) {
        setState({
          step: data.isEnrollment ? 'mfa-enroll' : 'mfa-verify',
          factorId: data.factorId,
          challengeId: data.challengeId,
          qrCode: data.qrCode,
          secret: data.secret,
        })
      } else {
        router.replace('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMfa(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId: state.factorId, challengeId: state.challengeId, code: totpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Código inválido'); return }
      router.replace('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full h-11 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.05)] px-4 text-sm text-white placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors'
  const btnCls = 'w-full h-11 rounded-lg bg-white text-black font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer'

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      {/* Card with iridescent border */}
      <div className="iridescent-border w-full max-w-sm">
        <div className="bg-[var(--surface-1)] rounded-xl px-8 py-10 space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <Image src="/brand/icon-512.png" alt="Axis" width={80} height={80} priority />
            <div className="text-center">
              <div className="text-2xl font-bold tracking-widest text-white">AXIS</div>
              <div className="font-mono text-xs text-[var(--text-3)] mt-0.5">Personal</div>
            </div>
          </div>

          {/* Brand phrase */}
          <p className="font-mono text-[11px] text-[var(--text-3)] text-center leading-relaxed">
            Do latim <em>eixo, centro</em>: ponto de equilíbrio e sustentação.
          </p>

          {/* Alerts */}
          {unauthorized && <p className="text-xs text-center text-[var(--danger)]">Acesso não autorizado.</p>}
          {mfaRequired && <p className="text-xs text-center text-[var(--warning)]">MFA obrigatório.</p>}
          {error && <p className="text-xs text-center text-[var(--danger)]">{error}</p>}

          {state.step === 'credentials' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
              <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputCls} />
              <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Entrando...' : 'Entrar'}</button>
            </form>
          )}

          {state.step === 'mfa-enroll' && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-2)] text-center">Configure seu autenticador. Escaneie o QR code.</p>
              {state.qrCode && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={state.qrCode} alt="QR Code MFA" className="w-40 h-40 rounded-lg border border-[var(--border)]" />
                </div>
              )}
              {state.secret && (
                <p className="text-[10px] text-[var(--text-3)] text-center break-all">
                  Chave: <span className="font-mono text-[var(--text-2)]">{state.secret}</span>
                </p>
              )}
              <form onSubmit={handleMfa} className="space-y-3">
                <input type="text" placeholder="Código TOTP" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} required maxLength={6} className={`${inputCls} text-center tracking-[0.5em] text-lg`} />
                <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Verificando...' : 'Confirmar'}</button>
              </form>
            </div>
          )}

          {state.step === 'mfa-verify' && (
            <form onSubmit={handleMfa} className="space-y-3">
              <p className="text-xs text-[var(--text-2)] text-center">Digite o código do autenticador.</p>
              <input type="text" placeholder="000000" value={totpCode} onChange={(e) => setTotpCode(e.target.value)} required maxLength={6} className={`${inputCls} text-center tracking-[0.5em] text-lg`} />
              <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Verificando...' : 'Verificar'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
