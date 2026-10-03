'use client'

import { useState } from 'react'
import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Project, Task, Message, ProjectFile, Page } from '@/lib/api/types'
import { Badge, statusBadgeVariant, priorityBadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { NewConversationSheet } from '@/components/conversations/NewConversationSheet'
import {
  ChevronRight, CheckCircle, Circle, Clock, MessageSquarePlus,
  RefreshCw, FileText, AlertCircle, ClipboardList
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Tab = 'overview' | 'tasks' | 'files' | 'conversations'

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente', high: 'Alta', normal: 'Normal', low: 'Baixa',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho', confirmed: 'Confirmada', in_progress: 'Em andamento', done: 'Concluída', archived: 'Arquivada',
}

function TaskRow({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) {
  const isOverdue = task.dueAt && task.dueAt < new Date().toISOString() && task.status !== 'done'
  return (
    <div className="flex items-start gap-3 border-b border-[var(--border)] py-3 last:border-0 group">
      <button
        onClick={() => onComplete(task.id)}
        className="mt-0.5 flex-shrink-0 text-[var(--text-3)] hover:text-[var(--success)] transition-colors"
        aria-label="Concluir tarefa"
        disabled={task.status === 'done' || task.status === 'archived'}
      >
        {task.status === 'done' ? <CheckCircle size={16} className="text-[var(--success)]" /> : <Circle size={16} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.status === 'done' ? 'line-through text-[var(--text-3)]' : 'text-[var(--text)]'}`}>
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant={statusBadgeVariant(task.status)}>{STATUS_LABELS[task.status]}</Badge>
          <Badge variant={priorityBadgeVariant(task.priority)}>{PRIORITY_LABELS[task.priority]}</Badge>
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

export default function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [conversationOpen, setConversationOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', slug],
    queryFn: async () => {
      const projects = await api.get<Project[]>('/projects')
      return projects.find((p) => p.slug === slug) ?? null
    },
  })

  const { data: tasksPage, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', { projectId: project?.id }],
    queryFn: () => api.get<Page<Task>>(`/tasks?project_id=${project!.id}&limit=50`),
    enabled: !!project,
  })

  const { data: messagesPage, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', { projectId: project?.id }],
    queryFn: () => api.get<Page<Message>>(`/messages?project_id=${project!.id}&limit=50`),
    enabled: !!project,
  })

  const { data: filesPage } = useQuery({
    queryKey: ['files', { projectId: project?.id }],
    queryFn: () => api.get<Page<ProjectFile>>(`/projects/${project!.id}/files`),
    enabled: !!project,
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}`, { status: 'done' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['projects', 'overview'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
    },
  })

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/messages/${id}/retry-extraction`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages'] }),
  })

  if (projectLoading) return <div className="flex h-64 items-center justify-center"><Spinner size={24} /></div>
  if (!project) return <div className="px-6 py-6 text-[var(--text-3)]">Projeto não encontrado</div>

  const tasks = tasksPage?.items ?? []
  const messages = messagesPage?.items ?? []
  const files = filesPage?.items ?? []
  const overdueTasks = tasks.filter((t) => t.dueAt && t.dueAt < new Date().toISOString() && t.status !== 'done')

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text-3)]">
        <a href="/dashboard" className="hover:text-[var(--text)]">Projetos</a>
        <ChevronRight size={12} />
        <span className="text-[var(--text-2)]">{project.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-4 w-4 flex-shrink-0 rounded-full" style={{ background: project.color }} />
          <div>
            <h1 className="text-xl font-bold text-[var(--text)]">{project.name}</h1>
            {overdueTasks.length > 0 && (
              <Badge variant="danger" className="mt-1">
                <AlertCircle size={10} />
                {overdueTasks.length} atrasada{overdueTasks.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setConversationOpen(true)}>
          <MessageSquarePlus size={14} />
          Nova conversa
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-0.5 border-b border-[var(--border)]">
        {([
          ['overview', 'Visão geral'],
          ['tasks', `Tarefas ${tasks.length > 0 ? `(${tasks.length})` : ''}`],
          ['files', `Arquivos ${files.length > 0 ? `(${files.length})` : ''}`],
          ['conversations', `Conversas ${messages.length > 0 ? `(${messages.length})` : ''}`],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as Tab)}
            className={`px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-[var(--accent-cyan)] text-[var(--text)] font-medium'
                : 'border-transparent text-[var(--text-3)] hover:text-[var(--text-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Tasks preview */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-2)]">Tarefas recentes</h2>
              <button onClick={() => setActiveTab('tasks')} className="text-xs text-[var(--accent-cyan)] hover:opacity-80">Ver todas</button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Nenhuma tarefa neste projeto.</p>
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4">
                {tasks.slice(0, 5).map((t) => (
                  <TaskRow key={t.id} task={t} onComplete={(id) => completeMutation.mutate(id)} />
                ))}
              </div>
            )}
          </div>
          {/* Files preview */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-2)]">Arquivos recentes</h2>
              <button onClick={() => setActiveTab('files')} className="text-xs text-[var(--accent-cyan)] hover:opacity-80">Ver todos</button>
            </div>
            {files.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">Nenhum arquivo neste projeto.</p>
            ) : (
              <div className="space-y-1">
                {files.slice(0, 3).map((f) => (
                  <div key={f.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                    <FileText size={14} className="text-[var(--text-3)]" />
                    <span className="flex-1 truncate">{f.name}</span>
                    {f.sizeBytes && <span className="font-mono text-[10px] text-[var(--text-3)]">{(f.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          {tasksLoading ? (
            <div className="flex justify-center py-16"><Spinner size={24} /></div>
          ) : tasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Nenhuma tarefa neste projeto"
              description="Crie uma nova conversa para extrair tarefas"
            />
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} onComplete={(id) => completeMutation.mutate(id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div>
          {files.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum arquivo neste projeto"
              description="Adicione arquivos ou planilhas do Google"
            />
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                  <FileText size={16} className="text-[var(--text-3)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)] truncate">{f.name}</p>
                    {f.sizeBytes && <p className="font-mono text-[10px] text-[var(--text-3)]">{(f.sizeBytes / 1024 / 1024).toFixed(1)} MB</p>}
                  </div>
                  <Badge variant={f.syncStatus === 'error' ? 'danger' : 'muted'}>
                    {f.kind === 'google_sheet' ? 'Planilha' : 'Upload'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 rounded-lg border border-dashed border-[var(--border-strong)] p-4 text-center text-sm text-[var(--text-3)]">
            Upload de arquivos disponível na próxima etapa
          </div>
        </div>
      )}

      {activeTab === 'conversations' && (
        <div>
          {messagesLoading ? (
            <div className="flex justify-center py-16"><Spinner size={24} /></div>
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageSquarePlus}
              title="Nenhuma conversa neste projeto"
              description="Cole uma conversa para extrair tarefas"
              action="Nova conversa"
              onAction={() => setConversationOpen(true)}
            />
          ) : (
            <div className="space-y-2">
              {messages.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          m.extractionStatus === 'extracted' ? 'success'
                          : m.extractionStatus === 'failed' ? 'danger'
                          : 'warning'
                        }
                      >
                        {m.extractionStatus === 'extracted' ? 'Extraída' : m.extractionStatus === 'failed' ? 'Falhou' : 'Pendente'}
                      </Badge>
                      <span className="font-mono text-[10px] text-[var(--text-3)]">
                        {format(parseISO(m.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {m.taskCount > 0 && (
                      <p className="mt-1 text-xs text-[var(--text-3)]">{m.taskCount} tarefa{m.taskCount !== 1 ? 's' : ''} extraída{m.taskCount !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  {m.extractionStatus === 'failed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => retryMutation.mutate(m.id)}
                      disabled={retryMutation.isPending}
                    >
                      <RefreshCw size={12} />
                      Tentar de novo
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <NewConversationSheet
        open={conversationOpen}
        onClose={() => setConversationOpen(false)}
        defaultProjectId={project.id}
      />
    </div>
  )
}
