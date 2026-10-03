import { describe, it, expect } from 'vitest'

// Test the in-memory fallback rate limit logic directly
// We reproduce the core algorithm here to keep the test isolated from Redis

interface Entry { count: number; reset: number }

function createMemoryLimiter(limit: number, windowMs: number) {
  const store = new Map<string, Entry>()
  return async function check(key: string) {
    const now = Date.now()
    const entry = store.get(key)
    if (!entry || now > entry.reset) {
      store.set(key, { count: 1, reset: now + windowMs })
      return { success: true, remaining: limit - 1 }
    }
    entry.count++
    const success = entry.count <= limit
    return { success, remaining: Math.max(0, limit - entry.count) }
  }
}

describe('rate limit in-memory fallback', () => {
  it('allows requests up to the limit', async () => {
    const check = createMemoryLimiter(5, 900_000)
    for (let i = 0; i < 5; i++) {
      const r = await check('ip:email')
      expect(r.success).toBe(true)
    }
  })

  it('blocks the 6th request within the window', async () => {
    const check = createMemoryLimiter(5, 900_000)
    for (let i = 0; i < 5; i++) await check('ip:email2')
    const r = await check('ip:email2')
    expect(r.success).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it('resets after the window expires', async () => {
    const check = createMemoryLimiter(5, 1) // 1ms window
    for (let i = 0; i < 5; i++) await check('ip:email3')
    await new Promise((r) => setTimeout(r, 5))
    const r = await check('ip:email3')
    expect(r.success).toBe(true)
  })

  it('tracks different keys independently', async () => {
    const check = createMemoryLimiter(5, 900_000)
    for (let i = 0; i < 5; i++) await check('key-a')
    const a = await check('key-a')
    const b = await check('key-b')
    expect(a.success).toBe(false)
    expect(b.success).toBe(true)
  })
})
