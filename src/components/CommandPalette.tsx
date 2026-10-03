'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { LayoutGrid, ClipboardList, Inbox, Calendar, Sun, Moon, MessageSquarePlus } from 'lucide-react'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { ProjectOverview } from '@/lib/api/types'

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [search, setSearch] = useState('')

  const { data: projects } = useQuery({
    queryKey: ['projects', 'overview'],
    queryFn: () => api.get<ProjectOverview[]>('/projects/overview'),
    enabled: open,
  })

  useEffect(() => {
    if (!open) queueMicrotask(() => setSearch(''))
  }, [open])

  function go(path: string) {
    router.push(path)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-1)] shadow-2xl">
        <Command label="Paleta de comandos" shouldFilter={true}>
          <div className="border-b border-[var(--border)] px-4 py-3">
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Ir para, criar, buscar..."
              className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-3)] focus:outline-none"
              autoFocus
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-[var(--text-3)]">
              Nenhum resultado
            </Command.Empty>

            <Command.Group heading={<span className="px-2 py-1 text-xs text-[var(--text-3)]">Navegar</span>}>
              {[
                { label: 'Projetos', href: '/dashboard', icon: LayoutGrid },
                { label: 'Hoje', href: '/dashboard/hoje', icon: ClipboardList },
                { label: 'Rascunhos', href: '/dashboard/rascunhos', icon: Inbox },
                { label: 'Calendário', href: '/dashboard/calendario', icon: Calendar },
              ].map(({ label, href, icon: Icon }) => (
                <Command.Item
                  key={href}
                  value={label}
                  onSelect={() => go(href)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] aria-selected:bg-[var(--surface-3)] aria-selected:text-[var(--text)]"
                >
                  <Icon size={14} />
                  {label}
                </Command.Item>
              ))}
            </Command.Group>

            {projects && projects.length > 0 && (
              <Command.Group heading={<span className="px-2 py-1 text-xs text-[var(--text-3)]">Projetos</span>}>
                {projects.map((p) => (
                  <Command.Item
                    key={p.id}
                    value={p.name}
                    onSelect={() => go(`/dashboard/projetos/${p.slug}`)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] aria-selected:bg-[var(--surface-3)] aria-selected:text-[var(--text)]"
                  >
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading={<span className="px-2 py-1 text-xs text-[var(--text-3)]">Ações</span>}>
              <Command.Item
                value="nova conversa"
                onSelect={() => { onClose(); }}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] aria-selected:bg-[var(--surface-3)] aria-selected:text-[var(--text)]"
              >
                <MessageSquarePlus size={14} />
                Nova conversa
              </Command.Item>
              <Command.Item
                value="alternar tema"
                onSelect={() => { toggle(); onClose() }}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] aria-selected:bg-[var(--surface-3)] aria-selected:text-[var(--text)]"
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                Alternar tema
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
