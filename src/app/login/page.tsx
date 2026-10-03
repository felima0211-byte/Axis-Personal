'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'Erro ao entrar')
        return
      }
      router.replace('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '16px' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
        {/* Iridescent border */}
        <div style={{ position: 'absolute', inset: '-2px', borderRadius: '18px', background: 'var(--iridescent)', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 1, background: 'var(--surface-1)', borderRadius: '16px', padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Image src="/brand/icon-512.png" alt="Axis" width={80} height={80} priority style={{ borderRadius: '16px' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '.1em', color: 'var(--text)' }}>AXIS</div>
              <div className="mono" style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>Personal</div>
            </div>
          </div>
          <p className="mono" style={{ fontSize: '11px', color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6 }}>
            Do latim <em>eixo, centro</em>: ponto de equilíbrio e sustentação.
          </p>
          {error && <p style={{ fontSize: '12px', color: 'var(--danger)', textAlign: 'center' }}>{error}</p>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ height: '42px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', padding: '0 12px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
            />
            <input
              type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ height: '42px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', padding: '0 12px', color: 'var(--text)', fontSize: '14px', outline: 'none' }}
            />
            <button
              type="submit" disabled={loading}
              style={{ height: '42px', borderRadius: '8px', background: 'var(--text)', color: 'var(--bg)', border: 'none', fontWeight: 700, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1, marginTop: '4px' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
