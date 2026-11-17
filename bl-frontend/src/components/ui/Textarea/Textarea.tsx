import { cn } from '@/utils/cn'
import type { TextareaProps } from './Textarea.types'

export function Textarea({ error = false, rows = 3, className, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={error || undefined}
      className={cn(
        'w-full rounded-md border bg-surface px-3.5 py-2.5 text-sm text-fg placeholder:text-fg-subtle transition',
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
