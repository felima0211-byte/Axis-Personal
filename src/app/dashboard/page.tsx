'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api/client'
import type { ProjectOverview, TodayData } from '@/lib/api/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { LayoutGrid, Plus, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const PROJECT_COLORS = [
  '#6ec1e4', '#a58bdf', '#e9b96a', '#6fd3b0', '#e9a6f0', '#f0997b',
]

type FilterStatus = 'active' | 'paused' | 'completed'

type NewProjectForm = { name: string; color: string }

function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset, watch } = useForm<NewProjectForm>({
    defaultValues: { name: '', color: '#6ec1e4' },
  })
  const selectedColor = watch('color')

  const mutation = useMutation({
    mutationFn: (data: NewProjectForm) => api.post<{ id: string }>('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', 'overview'] })
      reset()
      onClose()
    },
  })

  return (
    <Dialog open={open} onClose={onClose} title="Novo projeto">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-2)]">Nome</label>
          <input
            {...register('name', { required: true })}
            autoFocus
            placeholder="Nome do projeto"
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent-cyan)]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[var(--text-2)]">Cor</label>
          <div className="flex gap-2">
            {PROJECT_COLORS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input {...register('color')} type="radio" value={c} className="sr-only" />
                <span
                  className="block h-6 w-6 rounded-full transition-all"
                  style={{
                    background: c,
                    boxShadow: selectedColor === c ? `0 0 0 2px var(--bg), 0 0 0 4px ${c}` : undefined,
                  }}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" disabled={mutation.isPending} className="flex-1">
            {mutation.isPending ? <Spinner size={14} /> : 'Criar projeto'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function ProjectCard({ project }: { project: ProjectOverview }) {
  const router = useRouter()
  const nextDue = project.nextDueAt
    ? formatDistanceToNow(parseISO(project.nextDueAt), { addSuffix: true, locale: ptBR })
    : null

  return (
    <Card onClick={() => router.push(`/dashboard/projetos/${project.slug}`)} className="group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: project.color }} />
          <h2 className="font-semibold text-[var(--text)] group-hover:text-[var(--accent-cyan)] transition-colors">
            {project.name}
          </h2>
        </div>
        {project.overdueTasks > 0 && (
          <Badge variant="danger" className="flex-shrink-0">
            <AlertCircle size={10} />
            {project.overdueTasks} atrasada{project.overdueTasks !== 1 ? 's' : ''}
          </Badge>
        )}
        {project.overdueTasks === 0 && project.openTasks > 0 && (
          <Badge variant="success" className="flex-shrink-0 text-[10px]">em dia</Badge>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-3xl font-bold text-[var(--text)]">{project.openTasks}</span>
          <span className="text-xs text-[var(--text-3)]">abertas</span>
        </div>
        <Progress value={project.progress} />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="font-mono text-[10px] text-[var(--text-3)]">{project.progress}% concluído</span>
          {project.fileCount > 0 && (
            <span className="font-mono text-[10px] text-[var(--text-3)]">{project.fileCount} arquivo{project.fileCount !== 1 ? 's' : ''}</span>
          )}
        </div>
        {nextDue && (
          <p className="mt-1 font-mono text-[10px] text-[var(--text-3)]">Próximo prazo {nextDue}</p>
        )}
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const [filter, setFilter] = useState<FilterStatus>('active')
  const [newOpen, setNewOpen] = useState(false)

  const { data: today } = useQuery({
    queryKey: ['today'],
    queryFn: () => api.get<TodayData>('/today'),
  })

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', 'overview'],
    queryFn: () => api.get<ProjectOverview[]>('/projects/overview'),
  })

  const filtered = projects?.filter((p) => p.status === filter) ?? []
  const totalToday = (today?.overdue?.length ?? 0) + (today?.today?.reduce((s, g) => s + g.tasks.length, 0) ?? 0)

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      {/* Today strip */}
      {totalToday > 0 && (
        <a
          href="/dashboard/hoje"
          className="mb-6 flex items-center gap-3 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3 text-sm text-[var(--warning)] hover:bg-[var(--warning)]/15 transition-colors"
        >
          <AlertCircle size={16} />
          <span>
            <strong>{totalToday}</strong> tarefa{totalToday !== 1 ? 's' : ''} para hoje
            {(today?.overdue?.length ?? 0) > 0 && (
              <> · <strong className="text-[var(--danger)]">{today!.overdue.length} atrasada{today!.overdue.length !== 1 ? 's' : ''}</strong></>
            )}
          </span>
        </a>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Projetos</h1>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus size={14} />
          Novo projeto
        </Button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-1">
        {(['active', 'paused', 'completed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              filter === s
                ? 'bg-[var(--surface-3)] text-[var(--text)] font-medium'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            }`}
          >
            {{ active: 'Ativos', paused: 'Pausados', completed: 'Concluídos' }[s]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto para começar"
          action="Novo projeto"
          onAction={() => setNewOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
          <button
            onClick={() => setNewOpen(true)}
            className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] text-[var(--text-3)] transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
          >
            <Plus size={20} strokeWidth={1.5} />
            <span className="text-sm">Novo projeto</span>
          </button>
        </div>
      )}

      <NewProjectDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}
