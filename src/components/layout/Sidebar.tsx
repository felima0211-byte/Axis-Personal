'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Sun, Moon, MessageSquarePlus, Inbox, Calendar, ClipboardList } from 'lucide-react'
import { clsx } from 'clsx'
import { useTheme } from '@/components/providers/ThemeProvider'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

type Props = {
  draftCount?: number
  onNewConversation: () => void
}

const navItems = [
  { href: '/dashboard', label: 'Projetos', icon: LayoutGrid },
  { href: '/dashboard/hoje', label: 'Hoje', icon: ClipboardList },
  { href: '/dashboard/rascunhos', label: 'Rascunhos', icon: Inbox, badge: true },
  { href: '/dashboard/calendario', label: 'Calendário', icon: Calendar },
]

export function Sidebar({ onNewConversation }: Props) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()

  const { data: today } = useQuery({
    queryKey: ['today'],
    queryFn: () => api.get<{ draftCount: number }>('/today'),
    refetchInterval: 60_000,
  })

  const draftCount = today?.draftCount ?? 0

  return (
    <aside className="flex h-full w-56 flex-col border-r border-[var(--border)] bg-[var(--surface-1)] px-3 py-4">
      {/* Logo */}
      <div className="mb-6 flex items-center gap-2 px-2">
        <Image src="/brand/icon-512.png" alt="" width={24} height={24} className="flex-shrink-0" />
        <div className="leading-none">
          <span className="text-sm font-bold tracking-widest text-[var(--text)]">AXIS</span>
          <span className="ml-1.5 font-mono text-[10px] text-[var(--text-3)]">Personal</span>
        </div>
      </div>

      {/* Nova conversa */}
      <button
        onClick={onNewConversation}
        className="mb-4 flex w-full items-center gap-2 rounded-lg bg-[var(--text)] px-3 py-2 text-sm font-medium text-[var(--bg)] transition-opacity hover:opacity-90"
        aria-label="Nova conversa (N)"
      >
        <MessageSquarePlus size={15} />
        Nova conversa
        <kbd className="ml-auto font-mono text-[10px] opacity-50">N</kbd>
      </button>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5" aria-label="Navegação principal">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-100',
                isActive
                  ? 'font-medium text-[var(--text)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
              )}
              style={
                isActive
                  ? { background: 'var(--surface-3)', boxShadow: 'inset 0 0 0 1px var(--iridescent)' }
                  : undefined
              }
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={15} />
              {label}
              {badge && draftCount > 0 && (
                <span className="ml-auto rounded-full bg-[var(--warning)]/20 px-1.5 py-0.5 font-mono text-[10px] text-[var(--warning)]">
                  {draftCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="flex items-center justify-between px-2 pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success)]" aria-hidden="true" />
          <span className="font-mono text-[10px] text-[var(--text-3)]">ao vivo</span>
        </div>
        <button
          onClick={toggle}
          className="rounded p-1.5 text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
          aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </aside>
  )
}
