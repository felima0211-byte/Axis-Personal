'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Task { id: string; title: string; status: string; priority: string; due_at: string | null; project_id: string | null }
interface Project { id: string; name: string; color: string }
interface TodayData { overdue: Task[]; today: Task[]; draftsCount: number; reminders: {id:string;title:string;remind_at:string}[]; projects: Project[] }

export default function HojeScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<TodayData>({ queryKey: ['today'], queryFn: () => fetch('/api/v1/today').then((r) => r.json()) })

  const completeMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'done' }) }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today'] }),
  })

  if (isLoading) return <div style={{ padding: '32px', color: 'var(--text-3)' }}>Carregando...</div>

  const now = new Date()
  const projectMap = Object.fromEntries((data?.projects ?? []).map((p) => [p.id, p]))

  const taskRow = (t: Task, danger = false) => (
    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px' }}>
      <button onClick={() => completeMut.mutate(t.id)} style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1.5px solid var(--border-strong)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
        {t.status === 'done' && <Check size={10} color="#000" />}
      </button>
      <span style={{ flex: 1, fontSize: '13.5px' }}>{t.title}</span>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {t.project_id && projectMap[t.project_id] && (
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }} className="mono" onClick={() => router.push(`/projetos/${t.project_id}`)}>{projectMap[t.project_id].name}</span>
        )}
        {t.due_at && <span className="mono" style={{ fontSize: '11px', color: danger ? 'var(--danger)' : 'var(--text-3)' }}>{new Date(t.due_at).toLocaleDateString('pt-BR')}</span>}
      </div>
    </div>
  )

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ fontSize: '20px', fontWeight: 700 }}>Hoje</div>
        <div className="mono" style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '4px' }}>{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      {(data?.overdue.length ?? 0) > 0 && (
        <div style={{ background: 'rgba(242,109,109,.06)', border: '1px solid rgba(242,109,109,.2)', borderRadius: '10px', padding: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--danger)', padding: '4px 12px 8px' }}>Atrasadas</div>
          {data?.overdue.map((t) => taskRow(t, true))}
        </div>
      )}

      {(data?.today.length ?? 0) > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-3)', padding: '0 12px 8px' }}>Para hoje</div>
          {data?.today.map((t) => taskRow(t))}
        </div>
      )}

      {(data?.draftsCount ?? 0) > 0 && (
        <div style={{ background: 'rgba(110,193,228,.08)', border: '1px solid rgba(110,193,228,.2)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-2)' }}><strong style={{ color: 'var(--text)' }}>{data?.draftsCount} rascunhos</strong> aguardando revisão</span>
          <button onClick={() => router.push('/rascunhos')} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>Revisar →</button>
        </div>
      )}

      {(data?.overdue.length ?? 0) === 0 && (data?.today.length ?? 0) === 0 && (
        <p style={{ color: 'var(--text-3)' }}>Nenhuma tarefa para hoje.</p>
      )}
    </div>
  )
}
