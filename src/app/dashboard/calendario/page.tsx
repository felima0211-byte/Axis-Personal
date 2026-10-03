'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { Spinner } from '@/components/ui/Spinner'
import { Badge, priorityBadgeVariant } from '@/components/ui/Badge'
import { format, parseISO, getYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type UpcomingGroup = {
  weekStart: string
  weekEnd: string
  tasks: Array<{ id: string; title: string; dueAt: string; priority: string; projectName?: string }>
  reminders: Array<{ id: string; title: string; remindAt: string }>
}

type UpcomingData = { weeks: UpcomingGroup[] }

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente', high: 'Alta', normal: 'Normal', low: 'Baixa',
}

export default function CalendarioPage() {
  const until = `${getYear(new Date())}-12-31`

  const { data, isLoading } = useQuery({
    queryKey: ['upcoming', until],
    queryFn: () => api.get<UpcomingData>(`/upcoming?until=${until}`),
  })

  const weeks = data?.weeks ?? []
  const hasItems = weeks.some((w) => w.tasks.length > 0 || w.reminders.length > 0)

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size={24} /></div>

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <h1 className="mb-6 text-xl font-bold">Calendário</h1>

      {!hasItems ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <p className="font-medium text-[var(--text)]">Nenhuma tarefa com prazo</p>
          <p className="text-sm text-[var(--text-3)]">As tarefas com data de vencimento aparecem aqui</p>
        </div>
      ) : (
        <div className="space-y-8">
          {weeks.map((week) => {
            if (week.tasks.length === 0 && week.reminders.length === 0) return null
            const density = week.tasks.length + week.reminders.length
            return (
              <section key={week.weekStart}>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-[var(--text-2)]">
                    {format(parseISO(week.weekStart), "'Semana de' d 'de' MMMM", { locale: ptBR })}
                  </h2>
                  {/* Density bar */}
                  <div className="mt-1 h-1 w-full rounded-full bg-[var(--surface-3)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent-cyan)]"
                      style={{ width: `${Math.min(100, density * 10)}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {week.tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text)] truncate">{t.title}</p>
                        {t.projectName && (
                          <p className="text-[10px] text-[var(--text-3)]">{t.projectName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={priorityBadgeVariant(t.priority)}>{PRIORITY_LABELS[t.priority]}</Badge>
                        <span className="font-mono text-[10px] text-[var(--text-3)]">
                          {format(parseISO(t.dueAt), 'dd/MM', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {week.reminders.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] border-dashed bg-[var(--surface-3)] px-4 py-2.5">
                      <p className="flex-1 text-sm text-[var(--text-2)] truncate">{r.title}</p>
                      <span className="font-mono text-[10px] text-[var(--text-3)]">
                        {format(parseISO(r.remindAt), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
