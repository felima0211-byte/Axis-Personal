'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Task, TodayData } from '@/lib/api/types'
import { Badge, statusBadgeVariant, priorityBadgeVariant } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { AlertCircle, CheckCircle, Circle, Clock, Inbox } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', confirmed: 'Confirmada', in_progress: 'Em andamento', done: 'Concluída', archived: 'Arquivada',
}

function TaskItem({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) {
  const isOverdue = task.dueAt && task.dueAt < new Date().toISOString() && task.status !== 'done'
  return (
    <div className="flex items-start gap-3 border-b border-[var(--border)] py-3 last:border-0">
      <button
        onClick={() => onComplete(task.id)}
        className="mt-0.5 flex-shrink-0 text-[var(--text-3)] hover:text-[var(--success)] transition-colors"
        aria-label="Concluir tarefa"
        disabled={task.status === 'done'}
      >
        {task.status === 'done' ? <CheckCircle size={16} className="text-[var(--success)]" /> : <Circle size={16} />}
      </button>
      <div className="flex-1">
        <p className={`text-sm ${task.status === 'done' ? 'line-through text-[var(--text-3)]' : 'text-[var(--text)]'}`}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5 items-center">
          <Badge variant={statusBadgeVariant(task.status)}>{STATUS_LABELS[task.status]}</Badge>
          {task.dueAt && (
            <span className={`font-mono text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-[var(--danger)]' : 'text-[var(--text-3)]'}`}>
              <Clock size={10} />
              {format(parseISO(task.dueAt), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function HojePage() {
  const queryClient = useQueryClient()

  const { data: today, isLoading } = useQuery({
    queryKey: ['today'],
    queryFn: () => api.get<TodayData>('/today'),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}`, { status: 'done' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['today'] }),
  })

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size={24} /></div>

  const overdue = today?.overdue ?? []
  const groups = today?.today ?? []
  const draftCount = today?.draftCount ?? 0
  const hasAnything = overdue.length > 0 || groups.some((g) => g.tasks.length > 0)

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <h1 className="mb-6 text-xl font-bold">Hoje</h1>

      {/* Draft strip */}
      {draftCount > 0 && (
        <Link href="/dashboard/rascunhos" className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning)] hover:bg-[var(--warning)]/15 transition-colors">
          <Inbox size={16} />
          <span><strong>{draftCount}</strong> rascunho{draftCount !== 1 ? 's' : ''} aguardando revisão</span>
        </Link>
      )}

      {!hasAnything ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <CheckCircle size={32} className="text-[var(--success)]" strokeWidth={1.5} />
          <p className="font-medium">Tudo em dia por hoje!</p>
          <p className="text-sm text-[var(--text-3)]">Nenhuma tarefa pendente para hoje</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdue.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle size={14} className="text-[var(--danger)]" />
                <h2 className="text-sm font-semibold text-[var(--danger)]">Atrasadas ({overdue.length})</h2>
              </div>
              <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-4">
                {overdue.map((t) => (
                  <TaskItem key={t.id} task={t} onComplete={(id) => completeMutation.mutate(id)} />
                ))}
              </div>
            </section>
          )}

          {/* Today groups by project */}
          {groups.map((group, i) => (
            group.tasks.length > 0 && (
              <section key={i}>
                <h2 className="mb-3 text-sm font-semibold text-[var(--text-2)]">
                  {group.projectName ?? group.sectionName ?? 'Sem projeto'}
                </h2>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4">
                  {group.tasks.map((t) => (
                    <TaskItem key={t.id} task={t} onComplete={(id) => completeMutation.mutate(id)} />
                  ))}
                </div>
              </section>
            )
          ))}
        </div>
      )}
    </div>
  )
}
