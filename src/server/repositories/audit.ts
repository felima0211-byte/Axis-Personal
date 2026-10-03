import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditInput = {
  action: string
  entity: string
  entityId?: string | null
  metadata?: Record<string, string | number | boolean | null>
}

function safeMeta(m: AuditInput['metadata']) {
  const out: Record<string, string | number | boolean | null> = {}
  for (const [k, v] of Object.entries(m ?? {}))
    out[k] = typeof v === 'string' ? v.slice(0, 120) : v
  return out
}

export const auditRepo = {
  async insertMany(db: SupabaseClient, entries: AuditInput[], ipHash: string) {
    const rows = entries.map((e) => ({
      action: e.action,
      entity: e.entity,
      entity_id: e.entityId ?? null,
      metadata: safeMeta(e.metadata),
      ip_hash: ipHash,
    }))
    const { error } = await db.from('audit_log').insert(rows)
    if (error) throw error
  },
}
