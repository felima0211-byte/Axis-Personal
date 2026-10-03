import { clsx } from 'clsx'

export function Card({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4',
        onClick && 'cursor-pointer hover:border-[var(--border-strong)] transition-colors duration-150',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
