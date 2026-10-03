import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const h = vi.hoisted(() => ({
  createClient: vi.fn(),
  rateLimit: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: h.rateLimit }))
vi.mock('@/lib/env', () => ({ env: { OWNER_EMAIL: 'dono@x.com' } }))
vi.mock('@/server/crypto', () => ({ blindIndex: () => 'hash' }))
vi.mock('@/server/logger', () => ({ logger: { error: vi.fn() } }))

import { route } from './route'

const fakeDb = (o: { email?: string | null; level?: string } = {}) => ({
  auth: {
    getUser: async () => ({
      data: { user: o.email === null ? null : { id: 'u1', email: o.email ?? 'dono@x.com' } },
      error: null,
    }),
    mfa: {
      getAuthenticatorAssuranceLevel: async () => ({
        data: { currentLevel: o.level ?? 'aal2' },
      }),
    },
  },
  from: () => ({ insert: h.insert }),
})

const ctx = { params: Promise.resolve({}) }

const post = (body: unknown, origin = 'http://localhost') =>
  new NextRequest('http://localhost/api/x', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.rateLimit.mockResolvedValue({ success: true })
  h.insert.mockResolvedValue({ error: null })
  h.createClient.mockResolvedValue(fakeDb())
})

describe('route()', () => {
  const ok = route(
    { body: z.object({ n: z.number() }) },
    async ({ body, audit }) => {
      audit({ action: 'x', entity: 'x' })
      return { got: body.n }
    },
  )

  it('200 com sessão válida e grava auditoria', async () => {
    const res = await ok(post({ n: 1 }), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ got: 1 })
    expect(h.insert).toHaveBeenCalledOnce()
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('401 sem usuário', async () => {
    h.createClient.mockResolvedValue(fakeDb({ email: null }))
    expect((await ok(post({ n: 1 }), ctx)).status).toBe(401)
  })

  it('403 para e-mail que não é o dono', async () => {
    h.createClient.mockResolvedValue(fakeDb({ email: 'outro@x.com' }))
    expect((await ok(post({ n: 1 }), ctx)).status).toBe(403)
  })

  it('401 sem AAL2', async () => {
    h.createClient.mockResolvedValue(fakeDb({ level: 'aal1' }))
    expect((await ok(post({ n: 1 }), ctx)).status).toBe(401)
  })

  it('403 em POST de outra origem (CSRF)', async () => {
    expect((await ok(post({ n: 1 }, 'https://evil.com'), ctx)).status).toBe(403)
  })

  it('422 sem ecoar o valor inválido', async () => {
    const res = await ok(post({ n: 'segredo-123' }), ctx)
    expect(res.status).toBe(422)
    expect(JSON.stringify(await res.json())).not.toContain('segredo-123')
  })

  it('429 com Retry-After', async () => {
    h.rateLimit.mockResolvedValue({ success: false, retryAfter: 30 })
    const res = await ok(post({ n: 1 }), ctx)
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('30')
  })

  it('500 genérico, sem stack, com requestId', async () => {
    const boom = route({}, async () => {
      throw new Error('detalhe interno secreto')
    })
    const res = await boom(new NextRequest('http://localhost/api/x'), ctx)
    const j = await res.json()
    expect(res.status).toBe(500)
    expect(JSON.stringify(j)).not.toContain('secreto')
    expect(j.error.requestId).toBeTruthy()
  })

  it('500 (fail-closed) se a auditoria falhar', async () => {
    h.insert.mockResolvedValue({ error: { code: 'XX', message: 'falhou' } })
    expect((await ok(post({ n: 1 }), ctx)).status).toBe(500)
  })
})
