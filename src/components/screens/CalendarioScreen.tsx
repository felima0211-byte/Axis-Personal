'use client'
import { useQuery } from '@tanstack/react-query'
import { startOfWeek, addWeeks, format, isWithinInterval, endOfWeek, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Task { id: string; title: string; status: string; priority: string; due_at: string | null; project_id: string | null }

const PRIO_STYLE: Record<string, React.CSSProperties> = {
  urgent: { background: 'rgba(242,109,109,.15)', color: 'var(--danger)' },
  high: { background: 'rgba(233,185,106,.15)', color: 'var(--warning)' },
  normal: { background: 'rgba(110,193,228,.12)', color: 'var(--accent-cyan)' },
  low: { color: 'var(--text-3)', background: 'transparent' },
}

export default function CalendarioScreen() {
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ['tasks'], queryFn: () => fetch('/api/v1/tasks').then((r) => r.json()) })

  const withDue = tasks.filter((t) => t.due_at && !['done', 'archived'].includes(t.status))
  const now = new Date()
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = startOfWeek(addWeeks(now, i), { locale: ptBR })
    const end = endOfWeek(start, { locale: ptBR })
    const wTasks = withDue.filter((t) => t.due_at && isWithinInterval(parseISO(t.due_at), { start, end }))
    return { start, end, tasks: wTasks }
  }).filter((w) => w.tasks.length > 0)

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <span style={{ fontSize: '20px', fontWeight: 700 }}>Calendário</span>
      {weeks.length === 0 && <p style={{ color: 'var(--text-3)' }}>Nenhuma tarefa com prazo definido.</p>}
      {weeks.map((w, i) => (
        <div key={i}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '10px' }}>
            Semana de {format(w.start, "dd 'de' MMM", { locale: ptBR })} – {format(w.end, "dd 'de' MMM", { locale: ptBR })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {w.tasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '8px' }}>
                <span className="mono" style={{ width: '36px', fontSize: '11px', color: 'var(--text-3)', flexShrink: 0 }}>{format(parseISO(t.due_at!), 'EEE', { locale: ptBR })}</span>
                <span style={{ flex: 1, fontSize: '13.5px' }}>{t.title}</span>
                <span className="mono" style={{ fontSize: '11px', color: 'var(--text-3)' }}>{format(parseISO(t.due_at!), 'dd/MM')}</span>
                <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', fontWeight: 600, ...PRIO_STYLE[t.priority] }}>{t.priority}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
