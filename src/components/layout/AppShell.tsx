'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LayoutGrid, Clock, FileText, Calendar, Plus, Sun, Moon } from 'lucide-react'
import { NewConvDialog } from '@/components/ui/NewConvDialog'
import Image from 'next/image'

const NAV = [
  { href: '/dashboard', label: 'Projetos', icon: LayoutGrid },
  { href: '/hoje', label: 'Hoje', icon: Clock },
  { href: '/rascunhos', label: 'Rascunhos', icon: FileText },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [convOpen, setConvOpen] = useState(false)

  const { data: draftsData } = useQuery<{ length: number }>({
    queryKey: ['drafts-count'],
    queryFn: async () => {
      const r = await fetch('/api/v1/tasks?status=draft')
      const d = await r.json()
      return { length: Array.isArray(d) ? d.length : 0 }
    },
    refetchInterval: 30_000,
  })
  const draftsCount = draftsData?.length ?? 0

  useEffect(() => {
    const saved = (localStorage.getItem('axis-theme') ?? 'dark') as 'dark' | 'light'
    setTheme(saved)
    document.documentElement.dataset.theme = saved
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('axis-theme', next)
    document.documentElement.dataset.theme = next
  }

  const openConv = useCallback(() => setConvOpen(true), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'n' || e.key === 'N') openConv()
      if (e.key === 'Escape') setConvOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openConv])

  const sidebarStyle: React.CSSProperties = {
    width: '220px', flexShrink: 0, background: 'var(--surface-1)', borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: '4px', height: '100vh', position: 'sticky', top: 0,
  }
  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px', borderRadius: '8px',
    cursor: 'pointer', color: active ? 'var(--text)' : 'var(--text-2)', fontSize: '13.5px',
    background: active ? 'var(--surface-2)' : 'transparent', border: 'none', width: '100%',
    textAlign: 'left', textDecoration: 'none', position: 'relative', transition: 'background 120ms, color 120ms',
  })

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 20px', borderBottom: '1px solid var(--border)', marginBottom: '8px' }}>
          <Image src="/brand/icon-512.png" alt="Axis" width={24} height={24} style={{ borderRadius: '5px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '.08em', color: 'var(--text)' }}>AXIS</span>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)' }}>Personal</span>
          </div>
        </div>

        {/* Nav */}
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} style={navItemStyle(active)}>
              {active && (
                <span style={{ position: 'absolute', left: '-12px', top: '6px', bottom: '6px', width: '3px', borderRadius: '0 3px 3px 0', background: 'var(--iridescent)' }} />
              )}
              <Icon size={16} style={{ opacity: active ? 1 : 0.7 }} />
              {label}
              {label === 'Rascunhos' && draftsCount > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', marginLeft: 'auto', fontFamily: 'monospace' }}>
                  {draftsCount}
                </span>
              )}
            </Link>
          )
        })}

        {/* Bottom */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={openConv} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '9px', background: 'var(--surface-3)', border: '1px solid var(--border-strong)', color: 'var(--text)', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
            <Plus size={14} />
            Nova conversa
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 4px', marginLeft: 'auto' }}>N</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px' }}>
            <span style={{ width: '7px', height: '7px', background: 'var(--success)', borderRadius: '50%', animation: 'pulse 2s infinite', display: 'block' }} />
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-3)' }}>ao vivo</span>
          </div>
          <button onClick={toggleTheme} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', background: 'transparent', border: 'none', width: '100%' }}>
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            Alternar tema
          </button>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer', borderRadius: '6px', background: 'transparent', border: 'none', width: '100%' }}>
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>

      <NewConvDialog open={convOpen} onClose={() => setConvOpen(false)} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )
}
