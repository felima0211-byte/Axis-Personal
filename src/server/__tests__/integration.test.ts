import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// Mock env so module-level validation doesn't fail when Supabase vars are absent
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.RLS_TEST_URL ?? 'http://localhost',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.RLS_TEST_ANON_KEY ?? 'anon',
    OWNER_EMAIL: process.env.RLS_TEST_OWNER_EMAIL ?? 'owner@test.local',
    APP_TIMEZONE: 'America/Sao_Paulo',
    INGEST_DAILY_LIMIT: 50,
  },
}))

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sectionsRepo } from '@/server/repositories/sections'
import { tasksRepo } from '@/server/repositories/tasks'
import { messagesRepo } from '@/server/repositories/messages'
import { ingestConversation } from '@/server/services/ingest'
import { extractTasks } from '@/server/ai/extract-tasks'

vi.mock('@/server/ai/extract-tasks', async (orig) => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...(await (orig as () => Promise<any>)()),
  extractTasks: vi.fn(),
}))

const on = !!process.env.RLS_TEST_URL
const url = process.env.RLS_TEST_URL!
const anon = process.env.RLS_TEST_ANON_KEY!
const service = process.env.RLS_TEST_SERVICE_KEY!

describe.skipIf(!on)('integração: RLS, criptografia e ingestão', () => {
  let admin: SupabaseClient, owner: SupabaseClient, intruder: SupabaseClient, intruderId: string

  beforeAll(async () => {
    admin = createClient(url, service)
    owner = createClient(url, anon)
    const r = await owner.auth.signInWithPassword({
      email: process.env.RLS_TEST_OWNER_EMAIL!,
      password: process.env.RLS_TEST_OWNER_PASSWORD!,
    })
    expect(r.error).toBeNull()

    const email = `intruso-${Date.now()}@test.local`
    const created = await admin.auth.admin.createUser({
      email,
      password: 'Test-12345-xyz',
      email_confirm: true,
    })
    intruderId = created.data.user!.id
    intruder = createClient(url, anon)
    await intruder.auth.signInWithPassword({ email, password: 'Test-12345-xyz' })
  })

  afterAll(async () => {
    await admin.auth.admin.deleteUser(intruderId)
  })

  it('intruso e anônimo não leem nem alteram dados do dono', async () => {
    const s = await sectionsRepo.create(owner, { name: `RLS ${Date.now()}` })
    expect((await intruder.from('sections').select('*')).data ?? []).toHaveLength(0)
    expect(
      (await intruder.from('sections').update({ name: 'x' }).eq('id', s.id).select()).data ?? [],
    ).toHaveLength(0)
    expect(
      (await createClient(url, anon).from('sections').select('*')).data ?? [],
    ).toHaveLength(0)
  })

  it('audit_log é imutável', async () => {
    const ins = await owner
      .from('audit_log')
      .insert({ action: 't', entity: 't' })
      .select()
      .single()
    expect(ins.error).toBeNull()
    expect(
      (await owner.from('audit_log').update({ action: 'x' }).eq('id', ins.data!.id)).error,
    ).not.toBeNull()
    expect(
      (await owner.from('audit_log').delete().eq('id', ins.data!.id)).error,
    ).not.toBeNull()
  })

  it('tarefa fica cifrada no banco e volta em claro pelo repositório', async () => {
    const t = await tasksRepo.create(owner, { title: 'Pagar boleto segredo-xyz' })
    const raw = await admin.from('tasks').select('title_enc').eq('id', t.id).single()
    expect(raw.data!.title_enc).toMatch(/^v\d+:/)
    expect(raw.data!.title_enc).not.toContain('segredo-xyz')
    expect((await tasksRepo.get(owner, t.id)).title).toBe('Pagar boleto segredo-xyz')
  })

  it('ingestão: grava cifrado, cria rascunhos, rejeita duplicata e preserva a conversa se a IA falhar', async () => {
    const text = `Preciso do relatório até sexta ${Date.now()}`
    vi.mocked(extractTasks).mockResolvedValueOnce([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { title: 'Enviar relatório', priority: 'high', source_excerpt: 'relatório até sexta', confidence: 0.9 } as any,
    ])
    const r = await ingestConversation(owner, { text, source: 'pasted' })
    expect(r.tasks).toHaveLength(1)
    expect(r.tasks[0].status).toBe('draft')
    expect(r.tasks[0].messageId).toBe(r.message.id)
    const raw = await admin.from('messages').select('content_enc').eq('id', r.message.id).single()
    expect(raw.data!.content_enc).not.toContain('relatório')

    await expect(ingestConversation(owner, { text, source: 'pasted' })).rejects.toMatchObject({
      status: 409,
    })

    vi.mocked(extractTasks).mockRejectedValueOnce(new Error('boom'))
    const f = await ingestConversation(owner, {
      text: `outra conversa ${Date.now()}`,
      source: 'pasted',
    })
    expect(f.extractionFailed).toBe(true)
    expect((await messagesRepo.getMeta(owner, f.message.id)).extractionStatus).toBe('failed')
  })
})
