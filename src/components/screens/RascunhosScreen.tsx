'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Task { id: string; title: string; priority: string; due_at: string | null; source_excerpt: string | null; project_id: string | null }
interface Project { id: string; name: string; color: string }

export default function RascunhosScreen() {
  const qc = useQueryClient()
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ['tasks', 'draft'], queryFn: () => fetch('/api/v1/tasks?status=draft').then((r) => r.json()) })
  const { data: projects = [] } = useQuery<Project[]>({ queryKey: ['projects'], queryFn: () => fetch('/api/v1/projects').then((r) => r.json()) })

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]))

  const confirmMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'confirmed' }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['drafts-count'] }) },
  })
  const rejectMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/v1/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'archived' }) }).then((r) => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['drafts-count'] }) },
  })

  const btnSm = (color?: string): React.CSSProperties => ({ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', border: `1px solid ${color ?? 'var(--border)'}`, background: 'transparent', color: color ?? 'var(--text-2)', cursor: 'pointer' })

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
        <span style={{ fontSize: '20px', fontWeight: 700 }}>Rascunhos</span>
        <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>{tasks.length} aguardando revisão</span>
      </div>

      {tasks.length === 0 && <p style={{ color: 'var(--text-3)' }}>Nenhum rascunho pendente.</p>}

      {tasks.map((t) => {
        const proj = t.project_id ? projectMap[t.project_id] : null
        return (
          <div key={t.id} style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {proj && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: proj.color, display: 'block' }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{proj.name}</span>
                </div>
              )}
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{t.title}</div>
              {t.source_excerpt && (
                <div style={{ fontSize: '12px', color: 'var(--text-3)', fontStyle: 'italic', borderLeft: '2px solid var(--border-strong)', paddingLeft: '10px', lineHeight: 1.5 }}>
                  &ldquo;{t.source_excerpt.slice(0, 200)}&rdquo;
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <button onClick={() => confirmMut.mutate(t.id)} style={{ ...btnSm('rgba(92,201,160,.4)'), color: 'var(--success)' }}>Confirmar</button>
                <button onClick={() => rejectMut.mutate(t.id)} style={{ ...btnSm('rgba(242,109,109,.3)'), color: 'var(--danger)' }}>Rejeitar</button>
              </div>
            </div>
            {t.due_at && (
              <div className="mono" style={{ fontSize: '11px', color: 'var(--text-3)', flexShrink: 0 }}>
                {new Date(t.due_at).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
