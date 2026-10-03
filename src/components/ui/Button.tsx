import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-[var(--text)] text-[var(--bg)] hover:opacity-90',
        ghost: 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]',
        danger: 'bg-[var(--danger)] text-white hover:opacity-90',
        outline: 'border border-[var(--border-strong)] text-[var(--text)] hover:bg-[var(--surface-3)]',
      },
      size: {
        sm: 'h-7 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return <button ref={ref} className={clsx(buttonVariants({ variant, size }), className)} {...props} />
})
