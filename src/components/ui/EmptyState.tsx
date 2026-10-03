import type { LucideIcon } from 'lucide-react'
import { Button } from './Button'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {Icon && <Icon size={32} className="text-[var(--text-3)]" strokeWidth={1.5} />}
      <div>
        <p className="font-medium text-[var(--text)]">{title}</p>
        {description && <p className="mt-1 text-sm text-[var(--text-3)]">{description}</p>}
      </div>
      {action && onAction && (
        <Button size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  )
}
