import { forwardRef } from 'react'
import { clsx } from 'clsx'

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, label, error, id, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-xs text-[var(--text-2)]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          'h-9 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text)]',
          'placeholder:text-[var(--text-3)] transition-colors duration-150',
          'focus-visible:outline-none focus-visible:border-[var(--accent-cyan)]',
          error && 'border-[var(--danger)]',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-[var(--danger)]">{error}</span>}
    </div>
  )
})
