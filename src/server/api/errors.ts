import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { logger } from '@/server/logger'

export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public details?: unknown,
    public headers?: Record<string, string>,
  ) {
    super(message)
  }
}

function body(code: ErrorCode, message: string, requestId: string, details?: unknown) {
  return { error: { code, message, requestId, ...(details !== undefined ? { details } : {}) } }
}

export function toErrorResponse(e: unknown, requestId: string): Response {
  const base = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId }
  if (e instanceof ApiError) {
    return NextResponse.json(body(e.code, e.message, requestId, e.details), {
      status: e.status,
      headers: { ...base, ...e.headers },
    })
  }
  if (e instanceof ZodError) {
    const details = e.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    return NextResponse.json(body('VALIDATION_ERROR', 'Dados inválidos', requestId, details), {
      status: 422,
      headers: base,
    })
  }
  const pg = e as { code?: string }
  const map: Record<string, [number, ErrorCode, string]> = {
    '23505': [409, 'CONFLICT', 'Registro já existe'],
    '23503': [422, 'VALIDATION_ERROR', 'Referência inválida'],
    '42501': [403, 'FORBIDDEN', 'Acesso negado'],
    PGRST116: [404, 'NOT_FOUND', 'Não encontrado'],
  }
  if (pg?.code && map[pg.code]) {
    const [status, code, msg] = map[pg.code]
    return NextResponse.json(body(code, msg, requestId), { status, headers: base })
  }
  logger.error('erro não tratado', { requestId, name: (e as Error)?.name, code: pg?.code })
  return NextResponse.json(body('INTERNAL', 'Erro interno', requestId), { status: 500, headers: base })
}
