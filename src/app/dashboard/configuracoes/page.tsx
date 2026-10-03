'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/Spinner'
import { CheckCircle, AlertCircle, RefreshCw, Unlink } from 'lucide-react'
import { useState } from 'react'

type GoogleConnection = {
  id: string
  googleEmail: string
  status: 'active' | 'needs_reconnect' | 'revoked'
  connectedAt: string
}

function ConfiguracoesContent() {
  const params = useSearchParams()
  const queryClient = useQueryClient()
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  const connected = params.get('google_connected') === '1'
  const error = params.get('google_error')

  const { data: connection, isLoading } = useQuery({
    queryKey: ['google-connection'],
    queryFn: () => api.get<GoogleConnection | null>('/integrations/google/status').catch(() => null),
  })

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete('/integrations/google'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-connection'] })
      setDisconnectOpen(false)
    },
  })

  return (
    <div className="px-6 py-6 max-w-2xl mx-auto">
      <h1 className="mb-6 text-xl font-bold">Configurações</h1>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-2)]">Integrações</h2>

        {connected && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
            <CheckCircle size={14} />
            Conta Google conectada com sucesso!
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            <AlertCircle size={14} />
            Erro ao conectar: {decodeURIComponent(error)}
          </div>
        )}

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">Google Sheets</p>
                <p className="text-xs text-[var(--text-3)]">Somente leitura • planilhas.googleapis.com</p>
              </div>
            </div>

            {isLoading ? (
              <Spinner size={16} />
            ) : connection?.status === 'active' ? (
              <Badge variant="success">
                <CheckCircle size={10} />
                Conectado
              </Badge>
            ) : connection?.status === 'needs_reconnect' ? (
              <Badge variant="warning">
                <AlertCircle size={10} />
                Expirado
              </Badge>
            ) : (
              <Badge variant="muted">Desconectado</Badge>
            )}
          </div>

          {connection?.status === 'active' && (
            <p className="mt-2 text-xs text-[var(--text-3)]">Conta: {connection.googleEmail}</p>
          )}

          <div className="mt-4 flex gap-2">
            {!connection || connection.status === 'revoked' ? (
              <Button size="sm" onClick={() => window.location.href = '/api/v1/integrations/google'}>
                Conectar conta Google
              </Button>
            ) : connection.status === 'needs_reconnect' ? (
              <Button size="sm" onClick={() => window.location.href = '/api/v1/integrations/google'}>
                <RefreshCw size={14} />
                Reconectar
              </Button>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setDisconnectOpen(true)}>
                <Unlink size={14} />
                Desconectar
              </Button>
            )}
          </div>
        </div>
      </section>

      <Dialog open={disconnectOpen} onClose={() => setDisconnectOpen(false)} title="Desconectar Google">
        <p className="mb-4 text-sm text-[var(--text-2)]">
          Isso revogará o acesso e marcará todas as planilhas vinculadas como desconectadas. Os dados já sincronizados são preservados.
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setDisconnectOpen(false)} className="flex-1">Cancelar</Button>
          <Button variant="danger" onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending} className="flex-1">
            {disconnectMutation.isPending ? <Spinner size={12} /> : 'Desconectar'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

export default function ConfiguracoesPage() {
  return (
    <Suspense>
      <ConfiguracoesContent />
    </Suspense>
  )
}
