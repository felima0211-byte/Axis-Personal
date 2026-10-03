import { describe, it, expect } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/v1/integrations/google/callback',
  },
}))

vi.mock('@/server/crypto', () => ({
  encryptField: (v: string) => `enc:${v}`,
  decryptField: (v: string) => v.replace('enc:', ''),
  blindIndex: (v: string) => `bi:${v}`,
  CryptoError: class CryptoError extends Error {},
}))

import { vi } from 'vitest'

describe('Google OAuth', () => {
  it('signState and verifyState roundtrip', async () => {
    const { signState, verifyState } = await import('@/server/services/google-oauth')
    const state = 'my-random-state-abc123'
    const signed = signState(state)
    expect(signed).toContain(state)
    expect(verifyState(signed)).toBe(state)
  })

  it('verifyState rejects tampered state', async () => {
    const { signState, verifyState } = await import('@/server/services/google-oauth')
    const signed = signState('legit-state')
    const tampered = signed.replace('legit-state', 'evil-state')
    expect(verifyState(tampered)).toBeNull()
  })

  it('verifyState rejects missing MAC', async () => {
    const { verifyState } = await import('@/server/services/google-oauth')
    expect(verifyState('no-mac-here')).toBeNull()
  })

  it('buildAuthUrl includes required params', async () => {
    const { buildAuthUrl, generateCodeVerifier, codeVerifierToChallenge, signState } = await import(
      '@/server/services/google-oauth'
    )
    const verifier = generateCodeVerifier()
    const challenge = codeVerifierToChallenge(verifier)
    const state = signState('test-state')
    const url = buildAuthUrl(state, challenge)
    expect(url).toContain('access_type=offline')
    expect(url).toContain('code_challenge_method=S256')
    expect(url).toContain('spreadsheets.readonly')
  })
})
