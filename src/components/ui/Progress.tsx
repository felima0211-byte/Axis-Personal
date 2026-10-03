export function Progress({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)] ${className ?? ''}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: 'var(--iridescent)' }}
      />
    </div>
  )
}
