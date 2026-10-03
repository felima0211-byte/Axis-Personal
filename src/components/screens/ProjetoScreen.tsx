'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Check } from 'lucide-react'

interface Project { id: string; name: string; color: string; status: string }
interface Task { id: string; title: string; status: string; priority: string; due_at: string | null; project_id: string | null }
interface Message { id: string; content: string; requester_name: string | null; extraction_status: string; created_at: string }

const PRIO_STYLE: Record<string, React.CSSProperties> = {
  urgent: { background: 'rgba(242,109,109,.15)', color: 'var(--danger)' },
  high: { background: 'rgba(233,185,106,.15)', color: 'var(--warning)' },
  normal: { background: 'rgba(110,193,228,.12)', color: 'var(--accent-cyan)' },
  low: { color: 'var(--text-3)', background: 'transparent' },
}

export default function ProjetoScreen({ id }: { id: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'overview' | 'tasks' | 'conversations'>('overview')

  const { data: project } = useQuery<Project>({ queryKey: ['project', id], queryFn: () => fetch(`/api/v1/projects/${id}`).then((r) => r.json()) })
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ['tasks', id], queryFn: () => fetch(`/api/v1/tasks?project_id=${id}`).then((r) => r.json()) })
  const { data: messages = [] } = useQuery<Message[]>({ queryKey: ['messages', id], queryFn: () => fetch(`/api/v1/messages?project_id=${id}`).then((r) => r.json()) })

  const completeMut = useMutation({
    mutationFn: (taskId: string) => fetch(`/api/v1/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'done' }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', id] }),
  })

  if (!project) return <div style={{ padding: '32px', color: 'var(--text-3)' }}>Carregando...</div>

  const now = new Date().toISOString()
  const openTasks = tasks.filter((t) => !['done', 'archived'].includes(t.status))
  const overdue = openTasks.filter((t) => t.due_at && t.due_at < now)
  const tabStyle = (active: boolean): React.CSSProperties => ({ padding: '8px 16px', fontSize: '13px', color: active ? 'var(--text)' : 'var(--text-3)', cursor: 'pointer', borderBottom: active ? '2px solid var(--accent-cyan)' : '2px solid transparent', marginBottom: '-1px', background: 'transparent', border: 'none' })
  const taskRow = (t: Task) => (
    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer' }}>
      <button onClick={() => completeMut.mutate(t.id)} style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1.5px solid var(--border-strong)', background: t.status === 'done' ? 'var(--success)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
        {t.status === 'done' && <Check size={10} color="#000" />}
      </button>
      <span style={{ flex: 1, fontSize: '13.5px', color: t.status === 'done' ? 'var(--text-3)' : 'var(--text)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
      <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', fontWeight: 600, ...PRIO_STYLE[t.priority] }}>{t.priority}</span>
      {t.due_at && <span className="mono" style={{ fontSize: '11px', color: t.due_at < now ? 'var(--danger)' : 'var(--text-3)' }}>{new Date(t.due_at).toLocaleDateString('pt-BR')}</span>}
    </div>
  )

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <button onClick={() => router.push('/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-3)', fontSize: '12px', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: '8px' }}>
          <ChevronLeft size={14} /> Projetos
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: project.color, display: 'block' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{project.name}</h1>
          {overdue.length > 0 && <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(242,109,109,.15)', color: 'var(--danger)', fontWeight: 600 }}>{overdue.length} atrasadas</span>}
        </div>
        <p className="mono" style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>{openTasks.length} abertas · {messages.length} conversas</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['overview', 'tasks', 'conversations'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabStyle(tab === t)}>
            {t === 'overview' ? 'Visão geral' : t === 'tasks' ? 'Tarefas' : 'Conversas'}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {overdue.length > 0 && (
            <>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--danger)', padding: '0 12px', marginBottom: '4px' }}>Atrasadas</div>
              <div style={{ background: 'rgba(242,109,109,.06)', border: '1px solid rgba(242,109,109,.18)', borderRadius: '10px', padding: '8px' }}>
                {overdue.map(taskRow)}
              </div>
            </>
          )}
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 12px', marginTop: '8px', marginBottom: '4px' }}>Abertas</div>
          {openTasks.filter((t) => !overdue.find((o) => o.id === t.id)).map(taskRow)}
          {openTasks.length === 0 && <p style={{ color: 'var(--text-3)', padding: '12px' }}>Nenhuma tarefa aberta.</p>}
        </div>
      )}

      {tab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {tasks.filter((t) => t.status !== 'archived').map(taskRow)}
          {tasks.length === 0 && <p style={{ color: 'var(--text-3)', padding: '12px' }}>Nenhuma tarefa ainda.</p>}
        </div>
      )}

      {tab === 'conversations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.map((m) => (
            <div key={m.id} style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {m.requester_name && <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 600 }}>{m.requester_name}</span>}
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }} className="mono">{new Date(m.created_at).toLocaleDateString('pt-BR')}</span>
                <span style={{ marginLeft: 'auto', fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: m.extraction_status === 'done' ? 'rgba(92,201,160,.15)' : 'rgba(242,109,109,.15)', color: m.extraction_status === 'done' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>{m.extraction_status}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content.slice(0, 200)}{m.content.length > 200 ? '...' : ''}</p>
            </div>
          ))}
          {messages.length === 0 && <p style={{ color: 'var(--text-3)' }}>Nenhuma conversa ainda.</p>}
        </div>
      )}
    </div>
  )
}
