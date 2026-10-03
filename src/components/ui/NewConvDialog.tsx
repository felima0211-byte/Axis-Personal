'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'

interface Project { id: string; name: string; color: string }

export function NewConvDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [text, setText] = useState('')
  const [requester, setRequester] = useState('')
  const [projectId, setProjectId] = useState('')
  const [msg, setMsg] = useState('')

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/v1/projects').then((r) => r.json()),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: () =>
      fetch('/api/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, requester_name: requester || null, project_id: projectId || null }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['drafts-count'] })
      qc.invalidateQueries({ queryKey: ['messages'] })
      setMsg(`Salvo! ${data.tasksCreated} rascunho(s) criado(s).`)
      setText(''); setRequester(''); setProjectId('')
      setTimeout(() => { setMsg(''); onClose() }, 1500)
    },
  })

  if (!open) return null

  const inp: React.CSSProperties = { width: '100%', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-2)', padding: '8px 12px', color: 'var(--text)', fontSize: '13.5px', outline: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, background: 'var(--surface-1)', border: '1px solid var(--border-strong)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Nova conversa</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Cole o texto da conversa</label>
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Cole aqui a conversa..." style={{ ...inp, resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Solicitante</label>
            <input value={requester} onChange={(e) => setRequester(e.target.value)} placeholder="Nome" style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Projeto</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={inp}>
              <option value="">Nenhum</option>
              {projects.map((p: Project) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        {msg && <p style={{ fontSize: '12px', color: 'var(--success)', textAlign: 'center' }}>{msg}</p>}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: '8px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border)', fontSize: '13px', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={!text.trim() || mutation.isPending} style={{ padding: '8px 18px', borderRadius: '8px', background: 'var(--text)', color: 'var(--bg)', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: !text.trim() ? .5 : 1 }}>
            {mutation.isPending ? 'Salvando...' : 'Salvar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
