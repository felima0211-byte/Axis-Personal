import 'server-only'

const SENSITIVE_KEYS = new Set([
  'password', 'token', 'secret', 'key', 'content', 'message', 'plaintext',
  'payload', 'body', 'text', 'data', 'note', 'notes',
])

const REDACTED = '[REDACTED]'

export function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5) return obj
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return obj
  if (typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map((v) => redact(v, depth + 1))
  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? REDACTED : redact(v, depth + 1)
  }
  return result
}

type Level = 'info' | 'warn' | 'error'

function log(level: Level, message: string, meta?: unknown) {
  const safe = meta !== undefined ? redact(meta) : undefined
  const output = safe !== undefined
    ? `[${level.toUpperCase()}] ${message} ${JSON.stringify(safe)}`
    : `[${level.toUpperCase()}] ${message}`
  if (level === 'error') {
    console.error(output)
  } else if (level === 'warn') {
    console.warn(output)
  } else {
    console.log(output)
  }
}

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
}
