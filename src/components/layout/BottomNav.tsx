'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, ClipboardList, Inbox, Calendar, Plus } from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { href: '/dashboard', label: 'Projetos', icon: LayoutGrid },
  { href: '/dashboard/hoje', label: 'Hoje', icon: ClipboardList },
  { href: '/dashboard/rascunhos', label: 'Rascunhos', icon: Inbox },
  { href: '/dashboard/calendario', label: 'Calendário', icon: Calendar },
]

export function BottomNav({ onNewConversation }: { onNewConversation: () => void }) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border)] bg-[var(--surface-1)] flex items-center justify-around px-2 pb-safe"
      aria-label="Navegação inferior"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              'flex flex-col items-center gap-1 px-3 py-3 text-[10px] transition-colors min-w-[44px]',
              isActive ? 'text-[var(--text)]' : 'text-[var(--text-3)]',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            {label}
          </Link>
        )
      })}
      <button
        onClick={onNewConversation}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--text)] text-[var(--bg)] shadow-lg"
        aria-label="Nova conversa"
      >
        <Plus size={20} />
      </button>
    </nav>
  )
}
