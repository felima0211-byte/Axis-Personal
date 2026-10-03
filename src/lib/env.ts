import { z } from 'zod'

// Client-safe vars (NEXT_PUBLIC_* are embedded at build time)
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

// Server-only vars (never reach the browser)
const serverSchema = z.object({
  OWNER_EMAIL: z.string().email(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  // Encryption (Parte B) — optional until configured
  ENCRYPTION_KEYS: z.string().optional(),
  ENCRYPTION_ACTIVE_VERSION: z.string().optional(),
  BLIND_INDEX_KEY: z.string().optional(),
  // AI / Ingest (Parte 5)
  ANTHROPIC_API_KEY: z.string().min(20).optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5'),
  INGEST_DAILY_LIMIT: z.coerce.number().int().positive().default(50),
  APP_TIMEZONE: z.string().default('America/Sao_Paulo'),
})

function validateClient() {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  if (!parsed.success) {
    console.error('❌ Missing client environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid client environment configuration.')
  }
  return parsed.data
}

function validateServer() {
  if (typeof window !== 'undefined') {
    throw new Error('Server env accessed from client — check your imports.')
  }
  const parsed = serverSchema.safeParse({
    OWNER_EMAIL: process.env.OWNER_EMAIL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    ENCRYPTION_KEYS: process.env.ENCRYPTION_KEYS,
    ENCRYPTION_ACTIVE_VERSION: process.env.ENCRYPTION_ACTIVE_VERSION,
    BLIND_INDEX_KEY: process.env.BLIND_INDEX_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
    INGEST_DAILY_LIMIT: process.env.INGEST_DAILY_LIMIT,
    APP_TIMEZONE: process.env.APP_TIMEZONE,
  })
  if (!parsed.success) {
    console.error('❌ Missing server environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    throw new Error('Invalid server environment configuration.')
  }
  return parsed.data
}

export const clientEnv = validateClient()

// Export server env lazily — only evaluated on server
export const env = {
  ...clientEnv,
  get OWNER_EMAIL() { return validateServer().OWNER_EMAIL! },
  get SUPABASE_SERVICE_ROLE_KEY() { return validateServer().SUPABASE_SERVICE_ROLE_KEY },
  get UPSTASH_REDIS_REST_URL() { return validateServer().UPSTASH_REDIS_REST_URL },
  get UPSTASH_REDIS_REST_TOKEN() { return validateServer().UPSTASH_REDIS_REST_TOKEN },
  get ANTHROPIC_API_KEY() { return validateServer().ANTHROPIC_API_KEY! },
  get ANTHROPIC_MODEL() { return validateServer().ANTHROPIC_MODEL },
  get INGEST_DAILY_LIMIT() { return validateServer().INGEST_DAILY_LIMIT },
  get APP_TIMEZONE() { return validateServer().APP_TIMEZONE },
}
