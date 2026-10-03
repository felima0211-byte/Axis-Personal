'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api/client'
import type { ProjectOverview } from '@/lib/api/types'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Spinner } from '@/components/ui/Spinner'
import { AlertTriangle } from 'lucide-react'

type Form = {
  text: string
  projectId: string
  requesterName: string
}

export function NewConversationSheet({
  open,
  onClose,
  defaultProjectId,
}: {
  open: boolean
  onClose: () => void
  defaultProjectId?: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [apiError, setApiError] = useState<string | null>(null)

  const { data: projects } = useQuery({
    queryKey: ['projects', 'overview'],
    queryFn: () => api.get<ProjectOverview[]>('/projects/overview'),
    enabled: open,
  })

  const { register, handleSubmit, reset, formState } = useForm<Form>({
    defaultValues: { text: '', projectId: defaultProjectId ?? '', requesterName: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: Form) =>
      api.post<{ message: { id: string }; extractionFailed: boolean; tasks: unknown[] }>('/ingest', {
        text: data.text,
        projectId: data.projectId || undefined,
        requesterName: data.requesterName || undefined,
        source: 'pasted',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['today'] })
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      reset()
      onClose()
      router.push('/rascunhos')
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 409) setApiError('Conversa duplicada. Já foi ingerida antes.')
        else if (err.status === 429) setApiError('Limite diário atingido. Tente novamente amanhã.')
        else setApiError('Erro ao salvar conversa. Tente de novo.')
      }
    },
  })

  function onSubmit(data: Form) {
    setApiError(null)
    mutation.mutate(data)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Nova conversa" side="right">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-2)]">Projeto</label>
          <select
            {...register('projectId')}
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent-cyan)]"
          >
            <option value="">Sem projeto</option>
            {projects?.filter((p) => p.status === 'active').map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-2)]">Solicitante (opcional)</label>
          <input
            {...register('requesterName')}
            type="text"
            placeholder="Nome de quem enviou"
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent-cyan)]"
          />
        </div>

        <Textarea
          label="Texto da conversa"
          {...register('text', { required: true })}
          placeholder="Cole aqui a conversa completa..."
          className="min-h-[280px]"
        />

        {apiError && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            <AlertTriangle size={14} />
            {apiError}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending || !formState.isDirty} className="flex-1">
            {mutation.isPending ? <Spinner size={14} /> : 'Enviar'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
