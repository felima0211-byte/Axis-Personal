import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { env } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { blindIndex } from '@/server/crypto'
import { auditRepo, type AuditInput } from '@/server/repositories/audit'
import { ApiError, toErrorResponse } from './errors'

const MAX_BODY = 1_000_000

async function checkLimit(key: string, perMinute: number) {
  const r = await rateLimit(key, perMinute)
  if (!r.success)
    throw new ApiError(429, 'RATE_LIMITED', 'Muitas requisições', undefined, {
      'Retry-After': String(r.retryAfter ?? 60),
    })
}

function assertSameOrigin(req: NextRequest) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return
  const origin = req.headers.get('origin')
  if (!origin || new URL(origin).host !== req.nextUrl.host)
    throw new ApiError(403, 'FORBIDDEN', 'Origem inválida')
  const len = Number(req.headers.get('content-length') ?? 0)
  if (len > 0 && !req.headers.get('content-type')?.includes('application/json')) {
    throw new ApiError(422, 'VALIDATION_ERROR', 'Content-Type deve ser application/json')
  }
}

async function authenticate(db: SupabaseClient): Promise<string> {
  const {
    data: { user },
    error,
  } = await db.auth.getUser()
  if (error || !user) throw new ApiError(401, 'UNAUTHENTICATED', 'Sessão inválida')
  if (user.email?.toLowerCase() !== env.OWNER_EMAIL.toLowerCase())
    throw new ApiError(403, 'FORBIDDEN', 'Acesso negado')
  const { data: aal } = await db.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel !== 'aal2')
    throw new ApiError(401, 'UNAUTHENTICATED', 'Verificação em duas etapas necessária')
  return user.id
}

async function readBody<B extends z.ZodTypeAny>(req: NextRequest, schema: B): Promise<z.infer<B>> {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY)
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Corpo muito grande')
  const text = await req.text()
  if (text.length > MAX_BODY) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Corpo muito grande')
  let raw: unknown
  if (text) {
    try {
      raw = JSON.parse(text)
    } catch {
      throw new ApiError(422, 'VALIDATION_ERROR', 'JSON inválido')
    }
  }
  return schema.parse(raw)
}

const clientIp = (req: NextRequest) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

type Z = z.ZodTypeAny | undefined
type In<T extends Z> = T extends z.ZodTypeAny ? z.infer<T> : undefined
type Opts<B extends Z, Q extends Z, P extends Z> = {
  body?: B
  query?: Q
  params?: P
  status?: number
  perMinute?: number
}

export type Ctx<B extends Z, Q extends Z, P extends Z> = {
  req: NextRequest
  db: SupabaseClient
  userId: string
  requestId: string
  body: In<B>
  query: In<Q>
  params: In<P>
  audit: (e: AuditInput) => void
}

export function route<
  B extends Z = undefined,
  Q extends Z = undefined,
  P extends Z = undefined,
>(opts: Opts<B, Q, P>, handler: (c: Ctx<B, Q, P>) => Promise<unknown>) {
  return async (
    req: NextRequest,
    rc: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    const requestId = crypto.randomUUID()
    try {
      assertSameOrigin(req)
      const db = await createClient()
      const userId = await authenticate(db)
      await checkLimit(`api:${userId}`, 60)
      if (opts.perMinute)
        await checkLimit(`api:${userId}:${req.method}:${req.nextUrl.pathname}`, opts.perMinute)

      const params = opts.params ? opts.params.parse(await rc.params) : undefined
      const query = opts.query
        ? opts.query.parse(Object.fromEntries(req.nextUrl.searchParams))
        : undefined
      const body = opts.body ? await readBody(req, opts.body) : undefined

      const entries: AuditInput[] = []
      const result = await handler({
        req,
        db,
        userId,
        requestId,
        body,
        query,
        params,
        audit: (e) => entries.push(e),
      } as Ctx<B, Q, P>)

      if (entries.length)
        await auditRepo.insertMany(db, entries, blindIndex(clientIp(req), 'audit.ip'))

      if (result instanceof Response) return result
      return NextResponse.json(result ?? { ok: true }, {
        status: opts.status ?? 200,
        headers: { 'Cache-Control': 'no-store', 'X-Request-Id': requestId },
      })
    } catch (e) {
      return toErrorResponse(e, requestId)
    }
  }
}
