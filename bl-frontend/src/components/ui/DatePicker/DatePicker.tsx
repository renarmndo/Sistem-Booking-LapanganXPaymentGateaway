import { cn } from '@/utils/cn'
import type { DatePickerProps } from './DatePicker.types'

export function DatePicker({ error = false, className, ...rest }: DatePickerProps) {
  return (
    <input
      type="date"
      aria-invalid={error || undefined}
      className={cn(
        'h-11 w-full rounded-md border bg-surface px-3.5 text-sm text-fg transition md:h-10',
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
