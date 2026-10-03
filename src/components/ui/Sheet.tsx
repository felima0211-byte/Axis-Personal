'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from './Button'

export function Sheet({
  open,
  onClose,
  title,
  children,
  side = 'right',
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  side?: 'right' | 'bottom'
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40" aria-modal="true" role="dialog" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={clsx(
          'absolute bg-[var(--surface-1)] border-[var(--border)] overflow-y-auto',
          side === 'right'
            ? 'top-0 right-0 bottom-0 w-full max-w-lg border-l'
            : 'left-0 right-0 bottom-0 max-h-[90vh] rounded-t-xl border-t',
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar" className="ml-auto">
            <X size={16} />
          </Button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
