#!/usr/bin/env npx tsx
/**
 * Key rotation script for Axis Personal.
 *
 * Usage:
 *   npx tsx scripts/rotate-keys.ts --dry-run
 *   npx tsx scripts/rotate-keys.ts
 *
 * The script re-encrypts all encrypted fields in the given column list using
 * the currently active key version. Idempotent: rows already on the active
 * version are skipped. Processes in batches of BATCH_SIZE.
 *
 * Requires all env vars to be set (ENCRYPTION_KEYS, ENCRYPTION_ACTIVE_VERSION,
 * BLIND_INDEX_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { decryptField, encryptField } from '../src/server/crypto/index'

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 100

interface ColumnTarget {
  table: string
  column: string
  context: string
  idColumn?: string
}

// Register (table, column) pairs here in Fatia 3+ when real tables exist.
// Format: { table: 'messages', column: 'content', context: 'messages.content' }
const TARGETS: ColumnTarget[] = [
  // Example (uncomment and adjust when tables exist):
  // { table: 'messages', column: 'content', context: 'messages.content' },
]

async function rotateColumn(
  supabase: SupabaseClient,
  target: ColumnTarget,
  activeVersion: string,
): Promise<{ processed: number; rotated: number; skipped: number; errors: number }> {
  const { table, column, context, idColumn = 'id' } = target
  let offset = 0
  let processed = 0
  let rotated = 0
  let skipped = 0
  let errors = 0

  console.log(`\n  Table: ${table}, Column: ${column}`)

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(`${idColumn}, ${column}`)
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error(`  Error fetching batch at offset ${offset}:`, error.message)
      break
    }
    if (!data || data.length === 0) break

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of data as any[]) {
      processed++
      const payload = row[column] as string | null
      if (!payload) { skipped++; continue }

      // Check current version
      const version = payload.startsWith('v') ? payload.split(':')[0].slice(1) : null
      if (version === activeVersion) { skipped++; continue }

      try {
        const plain = decryptField(payload, context)
        const newPayload = encryptField(plain, context)

        if (DRY_RUN) {
          console.log(`  [dry-run] Would rotate ${table}.${column} id=${row[idColumn]}`)
        } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: updateError } = await (supabase as any)
            .from(table)
            .update({ [column]: newPayload })
            .eq(idColumn, row[idColumn])
          if (updateError) {
            console.error(`  Error updating id=${row[idColumn]}:`, updateError.message)
            errors++
            continue
          }
        }
        rotated++
      } catch (e) {
        console.error(`  Crypto error for id=${row[idColumn]}:`, (e as Error).message)
        errors++
      }
    }

    if (data.length < BATCH_SIZE) break
    offset += BATCH_SIZE
  }

  return { processed, rotated, skipped, errors }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const activeVersion = process.env.ENCRYPTION_ACTIVE_VERSION
  if (!activeVersion) {
    console.error('Missing ENCRYPTION_ACTIVE_VERSION')
    process.exit(1)
  }

  console.log(`\n🔑 Key rotation — active version: ${activeVersion}`)
  if (DRY_RUN) console.log('   Mode: DRY RUN (no changes will be written)\n')
  else console.log('   Mode: LIVE\n')

  if (TARGETS.length === 0) {
    console.log('No targets registered. Add (table, column) pairs to TARGETS in this script.')
    process.exit(0)
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

  let totalRotated = 0
  let totalErrors = 0

  for (const target of TARGETS) {
    const result = await rotateColumn(supabase, target, activeVersion)
    console.log(`  → processed=${result.processed} rotated=${result.rotated} skipped=${result.skipped} errors=${result.errors}`)
    totalRotated += result.rotated
    totalErrors += result.errors
  }

  console.log(`\nDone. Total rotated: ${totalRotated}, errors: ${totalErrors}`)
  if (totalErrors > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
