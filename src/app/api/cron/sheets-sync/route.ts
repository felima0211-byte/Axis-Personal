import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { syncAllSheets, deleteOrphanUploads } from '@/server/services/sheets-sync'
import { env } from '@/lib/env'

export async function POST(req: NextRequest) {
  const cronSecret = env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  let valid = false
  try {
    const a = Buffer.from(token)
    const b = Buffer.from(cronSecret)
    valid = a.length === b.length && timingSafeEqual(a, b)
  } catch {}

  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = await createClient()
    const { data: { user } } = await db.auth.getUser()

    await syncAllSheets(db)
    if (user) await deleteOrphanUploads(db, user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cron] sheets-sync error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
