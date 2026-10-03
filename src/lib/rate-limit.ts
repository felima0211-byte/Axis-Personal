import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null
let isDevFallback = false

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Upstash Redis not configured in production')
    }
    if (!isDevFallback) {
      console.warn('[rate-limit] Upstash not configured — using in-memory fallback (dev only)')
      isDevFallback = true
    }
    return null
  }
  redis = new Redis({ url, token })
  return redis
}

// In-memory fallback for local dev without Upstash
const memoryStore = new Map<string, { count: number; reset: number }>()

async function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry || now > entry.reset) {
    memoryStore.set(key, { count: 1, reset: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }
  entry.count++
  const success = entry.count <= limit
  return { success, remaining: Math.max(0, limit - entry.count), reset: entry.reset }
}

function buildRatelimit(
  requests: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1]
) {
  const r = getRedis()
  if (!r) return null
  return new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(requests, window) })
}

export const loginRatelimit = buildRatelimit(5, '15 m')
export const apiRatelimit = buildRatelimit(60, '1 m')

export async function checkLoginRateLimit(ip: string, email: string) {
  const key = `login:${ip}:${email}`
  if (!loginRatelimit) return memoryLimit(key, 5, 15 * 60 * 1000)
  const result = await loginRatelimit.limit(key)
  return { success: result.success, remaining: result.remaining, reset: result.reset }
}

export async function checkApiRateLimit(userId: string) {
  const key = `api:${userId}`
  if (!apiRatelimit) return memoryLimit(key, 60, 60 * 1000)
  const result = await apiRatelimit.limit(key)
  return { success: result.success, remaining: result.remaining, reset: result.reset }
}
