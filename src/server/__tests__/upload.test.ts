import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    UPLOAD_MAX_MB: 25,
    SHEETS_MAX_ROWS: 5000,
    SHEETS_MAX_COLS: 30,
  },
}))

vi.mock('@/server/crypto', () => ({
  encryptField: (v: string) => `enc:${v}`,
  decryptField: (v: string) => v.replace('enc:', ''),
  encryptJson: (v: unknown) => `encj:${JSON.stringify(v)}`,
  decryptJson: (v: string) => JSON.parse(v.replace('encj:', '')),
  blindIndex: (v: string) => `bi:${v}`,
  CryptoError: class CryptoError extends Error {},
}))

describe('upload validation', () => {
  // Import after mocks are set
  it('rejects disallowed mime types', async () => {
    const { getUploadUrl } = await import('@/server/services/upload')
    const db = { storage: { from: vi.fn() } } as any
    await expect(
      getUploadUrl(db, 'user1', 'proj1', 'file1', 'hack.html', 'text/html', 1024),
    ).rejects.toThrow()
  })

  it('rejects files exceeding size limit', async () => {
    const { getUploadUrl } = await import('@/server/services/upload')
    const db = { storage: { from: vi.fn() } } as any
    const bigSize = 26 * 1024 * 1024
    await expect(
      getUploadUrl(db, 'user1', 'proj1', 'file1', 'doc.pdf', 'application/pdf', bigSize),
    ).rejects.toThrow()
  })
})

describe('inferColumnTypes', () => {
  it('detects currency BRL', async () => {
    const { inferColumnType } = await import('@/server/services/sheets-sync')
    expect(inferColumnType(['R$ 1.234,56', 'R$ 200,00', 'R$ 50,00'])).toBe('currency_brl')
  })

  it('detects percentage', async () => {
    const { inferColumnType } = await import('@/server/services/sheets-sync')
    expect(inferColumnType(['12,5%', '33%', '100%'])).toBe('percentage')
  })

  it('detects date (dd/mm/yyyy)', async () => {
    const { inferColumnType } = await import('@/server/services/sheets-sync')
    expect(inferColumnType(['31/12/2026', '01/01/2025', '15/06/2026'])).toBe('date')
  })

  it('detects boolean (sim/não)', async () => {
    const { inferColumnType } = await import('@/server/services/sheets-sync')
    expect(inferColumnType(['sim', 'não', 'sim', 'não'])).toBe('boolean')
  })

  it('falls back to text for mixed values', async () => {
    const { inferColumnType } = await import('@/server/services/sheets-sync')
    expect(inferColumnType(['João', 'Maria', 'R$ 100', 'teste'])).toBe('text')
  })

  it('handles empty cells', async () => {
    const { inferColumnType } = await import('@/server/services/sheets-sync')
    expect(inferColumnType(['', '', ''])).toBe('text')
  })

  it('treats script injection as plain text', async () => {
    const { inferColumnType } = await import('@/server/services/sheets-sync')
    expect(inferColumnType(['<script>alert(1)</script>', '=HYPERLINK("x","y")'])).toBe('text')
  })
})
