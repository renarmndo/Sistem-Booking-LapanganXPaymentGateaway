import { cn } from '@/utils/cn'
import type { InputProps } from './Input.types'

export function Input({ error = false, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={error || undefined}
      className={cn(
        'h-11 w-full rounded-md border bg-surface px-3.5 text-sm text-fg placeholder:text-fg-subtle transition md:h-10',
        'focus:outline-none focus:ring-2 focus:ring-primary-300',
        'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:opacity-60',
        error
          ? 'border-danger focus:border-danger focus:ring-danger/25'
          : 'border-line-strong focus:border-primary-600',
        className,
      )}
      {...rest}
    />
  )
}
