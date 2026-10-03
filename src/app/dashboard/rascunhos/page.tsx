'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Task, Page } from '@/lib/api/types'
import { Badge, priorityBadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Inbox, Check, X, CheckSquare } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente', high: 'Alta', normal: 'Normal', low: 'Baixa',
}

export default function RascunhosPage() {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: page, isLoading } = useQuery({
    queryKey: ['tasks', { status: 'draft' }],
    queryFn: () => api.get<Page<Task>>('/tasks?status=draft&limit=100'),
  })

  const confirmMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/confirm`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const bulkMutation = useMutation({
    mutationFn: (ids: string[]) => api.post<{ confirmed: string[]; skipped: string[] }>('/tasks/confirm-bulk', { ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      setSelected(new Set())
    },
  })

  const drafts = page?.items ?? []

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(drafts.map((t) => t.id)))
  }

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size={24} /></div>

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Rascunhos</h1>
          {drafts.length > 0 && (
            <p className="mt-1 text-sm text-[var(--text-3)]">{drafts.length} aguardando revisão</p>
          )}
        </div>
        {selected.size > 0 && (
          <Button
            size="sm"
            onClick={() => bulkMutation.mutate(Array.from(selected))}
            disabled={bulkMutation.isPending}
          >
            {bulkMutation.isPending ? <Spinner size={12} /> : <CheckSquare size={14} />}
            Confirmar {selected.size} selecionada{selected.size !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {drafts.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Nenhum rascunho pendente"
          description="Todas as tarefas foram revisadas"
        />
      ) : (
        <div>
          {drafts.length > 1 && (
            <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-3)]">
              <button onClick={selectAll} className="hover:text-[var(--accent-cyan)]">Selecionar todas</button>
              {selected.size > 0 && (
                <button onClick={() => setSelected(new Set())} className="hover:text-[var(--text-2)]">Limpar</button>
              )}
            </div>
          )}

          <div className="space-y-3">
            {drafts.map((task) => (
              <div
                key={task.id}
                className={`rounded-xl border px-4 py-4 transition-colors ${
                  selected.has(task.id) ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5' : 'border-[var(--border)] bg-[var(--surface-2)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(task.id)}
                    onChange={() => toggleSelect(task.id)}
                    className="mt-1 h-4 w-4 accent-[var(--accent-cyan)]"
                    aria-label="Selecionar tarefa"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text)]">{task.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant={priorityBadgeVariant(task.priority)}>{PRIORITY_LABELS[task.priority]}</Badge>
                      {task.dueAt && (
                        <span className="font-mono text-[10px] text-[var(--text-3)]">
                          {format(parseISO(task.dueAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      )}
                      {task.aiConfidence != null && (
                        <span className="font-mono text-[10px] text-[var(--text-3)]">
                          confiança {Math.round(task.aiConfidence * 100)}%
                        </span>
                      )}
                    </div>
                    {task.sourceExcerpt && (
                      <blockquote className="mt-2 border-l-2 border-[var(--border-strong)] pl-3 text-xs text-[var(--text-3)] italic line-clamp-2">
                        {task.sourceExcerpt}
                      </blockquote>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => rejectMutation.mutate(task.id)}
                      disabled={rejectMutation.isPending}
                      aria-label="Rejeitar tarefa"
                    >
                      <X size={14} className="text-[var(--danger)]" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => confirmMutation.mutate(task.id)}
                      disabled={confirmMutation.isPending}
                      aria-label="Confirmar tarefa"
                    >
                      <Check size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
