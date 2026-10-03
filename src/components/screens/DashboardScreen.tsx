'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'

interface Project { id: string; name: string; color: string; status: string; created_at: string }
interface Task { id: string; project_id: string | null; status: string; due_at: string | null }
interface TodayData { overdue: Task[]; today: Task[]; draftsCount: number }

const COLORS = ['#6ec1e4', '#a58bdf', '#e9b96a', '#6fd3b0', '#e9a6f0', '#f0997b']

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6ec1e4')
  const mutation = useMutation({
    mutationFn: () => fetch('/api/v1/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, color }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); onClose() },
  })
  const inp: React.CSSProperties = { width: '100%', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', padding: '8px 12px', color: 'var(--text)', fontSize: '13.5px', outline: 'none' }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, background: 'var(--surface-1)', border: '1px solid var(--border-strong)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Novo projeto</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Nome</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do projeto" style={inp} onKeyDown={(e) => e.key === 'Enter' && name.trim() && mutation.mutate()} />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Cor</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} style={{ width: '26px', height: '26px', borderRadius: '50%', background: c, border: `2px solid ${color === c ? 'var(--text)' : 'transparent'}`, cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending} style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--text)', color: 'var(--bg)', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: !name.trim() ? .5 : 1 }}>
            Criar projeto
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardScreen() {
  const router = useRouter()
  const [filter, setFilter] = useState<'active' | 'paused' | 'completed'>('active')
  const [newOpen, setNewOpen] = useState(false)

  const { data: projects = [], isLoading } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => fetch('/api/v1/projects').then((r) => r.json()) })
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ['tasks'], queryFn: () => fetch('/api/v1/tasks').then((r) => r.json()) })
  const { data: todayData } = useQuery<TodayData>({ queryKey: ['today'], queryFn: () => fetch('/api/v1/today').then((r) => r.json()) })

  const filtered = projects.filter((p) => {
    if (filter === 'active') return p.status === 'active'
    if (filter === 'paused') return p.status === 'paused'
    return p.status === 'completed'
  })

  const overdueCount = todayData?.overdue.length ?? 0
  const todayCount = todayData?.today.length ?? 0

  function getProjectStats(id: string) {
    const pt = tasks.filter((t) => t.project_id === id && t.status !== 'archived')
    const open = pt.filter((t) => t.status !== 'done').length
    const done = pt.filter((t) => t.status === 'done').length
    const now = new Date().toISOString()
    const overdue = pt.filter((t) => t.status !== 'done' && t.due_at && t.due_at < now).length
    const progress = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0
    return { open, overdue, progress }
  }

  const cardStyle: React.CSSProperties = { background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'border-color 120ms' }
  const filterBtn = (active: boolean): React.CSSProperties => ({ padding: '5px 12px', borderRadius: '20px', border: '1px solid var(--border)', background: active ? 'var(--surface-2)' : 'transparent', color: active ? 'var(--text)' : 'var(--text-2)', fontSize: '12px', cursor: 'pointer', borderColor: active ? 'var(--border-strong)' : 'var(--border)' })

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Today banner */}
      <div onClick={() => router.push('/hoje')} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>
          <strong style={{ color: 'var(--text)' }}>{todayCount} tarefas</strong> para hoje
          {overdueCount > 0 && <> · <strong style={{ color: 'var(--danger)' }}>{overdueCount} atrasadas</strong></>}
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>→</span>
      </div>

      {/* Header + filters */}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '10px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700 }}>Projetos</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={filterBtn(filter === 'active')} onClick={() => setFilter('active')}>Ativos</button>
          <button style={filterBtn(filter === 'paused')} onClick={() => setFilter('paused')}>Pausados</button>
          <button style={filterBtn(filter === 'completed')} onClick={() => setFilter('completed')}>Concluídos</button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <p style={{ color: 'var(--text-3)' }}>Carregando...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {filtered.map((p) => {
            const stats = getProjectStats(p.id)
            return (
              <div key={p.id} style={cardStyle} onClick={() => router.push(`/projetos/${p.id}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color, flexShrink: 0, display: 'block' }} />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</span>
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 800, lineHeight: 1 }}>{stats.open}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>tarefas abertas</div>
                </div>
                <div>
                  {stats.overdue > 0
                    ? <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: 'rgba(242,109,109,.15)', color: 'var(--danger)' }}>{stats.overdue} atrasadas</span>
                    : <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: 'rgba(92,201,160,.15)', color: 'var(--success)' }}>em dia</span>
                  }
                </div>
                <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${stats.progress}%`, borderRadius: '2px', background: 'var(--iridescent)' }} />
                </div>
              </div>
            )
          })}
          {/* New project card */}
          <div style={{ ...cardStyle, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', minHeight: '160px', color: 'var(--text-3)' }} onClick={(e) => { e.stopPropagation(); setNewOpen(true) }}>
            <Plus size={20} />
            <span style={{ fontSize: '13px' }}>Novo projeto</span>
          </div>
        </div>
      )}

      {newOpen && <NewProjectDialog onClose={() => setNewOpen(false)} />}
    </div>
  )
}
