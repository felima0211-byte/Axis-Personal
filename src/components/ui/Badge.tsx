import { clsx } from 'clsx'

type Variant = 'default' | 'danger' | 'warning' | 'success' | 'muted'

const variants: Record<Variant, string> = {
  default: 'bg-[var(--surface-3)] text-[var(--text-2)]',
  danger: 'bg-[var(--danger)]/20 text-[var(--danger)]',
  warning: 'bg-[var(--warning)]/20 text-[var(--warning)]',
  success: 'bg-[var(--success)]/20 text-[var(--success)]',
  muted: 'bg-[var(--surface-3)] text-[var(--text-3)]',
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: Variant
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function statusBadgeVariant(status: string): Variant {
  switch (status) {
    case 'done': return 'success'
    case 'archived': return 'muted'
    case 'draft': return 'warning'
    case 'confirmed':
    case 'in_progress': return 'default'
    default: return 'default'
  }
}

export function priorityBadgeVariant(priority: string): Variant {
  switch (priority) {
    case 'urgent': return 'danger'
    case 'high': return 'warning'
    case 'normal': return 'default'
    case 'low': return 'muted'
    default: return 'default'
  }
}
