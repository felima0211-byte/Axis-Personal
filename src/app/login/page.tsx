'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
      if (!res.ok) {
        setError(data.error ?? 'Erro ao fazer login')
        return
      }
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
        body: JSON.stringify({
          factorId: state.factorId,
          challengeId: state.challengeId,
          code: totpCode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Código inválido')
        return
      }
      router.replace('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-6 p-8 bg-gray-900 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white text-center">Axis Personal</h1>

        {unauthorized && (
          <p className="text-red-400 text-sm text-center">Acesso não autorizado.</p>
        )}
        {mfaRequired && (
          <p className="text-yellow-400 text-sm text-center">MFA obrigatório.</p>
        )}
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {state.step === 'credentials' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {state.step === 'mfa-enroll' && (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm text-center">
              Configure seu autenticador. Escaneie o QR code com Google Authenticator ou similar.
            </p>
            {state.qrCode && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={state.qrCode} alt="QR Code MFA" className="w-40 h-40 rounded-lg" />
              </div>
            )}
            {state.secret && (
              <p className="text-xs text-gray-500 text-center break-all">
                Chave manual: <span className="font-mono text-gray-400">{state.secret}</span>
              </p>
            )}
            <form onSubmit={handleMfa} className="space-y-4">
              <input
                type="text"
                placeholder="Código TOTP (6 dígitos)"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500 text-center tracking-widest text-xl"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Confirmar'}
              </button>
            </form>
          </div>
        )}

        {state.step === 'mfa-verify' && (
          <form onSubmit={handleMfa} className="space-y-4">
            <p className="text-gray-300 text-sm text-center">
              Digite o código do seu autenticador.
            </p>
            <input
              type="text"
              placeholder="Código TOTP (6 dígitos)"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              required
              maxLength={6}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:border-blue-500 text-center tracking-widest text-xl"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </form>
        )}
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
