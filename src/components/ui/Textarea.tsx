import { forwardRef } from 'react'
import { clsx } from 'clsx'

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
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
      <textarea
        ref={ref}
        id={id}
        className={clsx(
          'min-h-[120px] rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]',
          'placeholder:text-[var(--text-3)] transition-colors duration-150 resize-vertical',
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
