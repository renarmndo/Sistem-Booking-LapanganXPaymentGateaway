import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { SelectProps } from './Select.types'

export function Select({
  options,
  placeholder,
  error = false,
  className,
  children,
  ...rest
}: SelectProps) {
  return (
    <div className="relative">
      <select
        aria-invalid={error || undefined}
        className={cn(
          'h-11 w-full appearance-none rounded-md border bg-surface pr-10 pl-3.5 text-sm text-fg transition md:h-10',
          'focus:outline-none focus:ring-2 focus:ring-primary-300',
          'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:opacity-60',
          error
            ? 'border-danger focus:border-danger focus:ring-danger/25'
            : 'border-line-strong focus:border-primary-600',
          className,
        )}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-fg-muted"
      />
    </div>
  )
}
