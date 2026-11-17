import { useId } from 'react'
import { cn } from '@/utils/cn'
import type { CheckboxProps } from './Checkbox.types'

export function Checkbox({
  id,
  label,
  description,
  error = false,
  className,
  ...rest
}: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        aria-invalid={error || undefined}
        className={cn(
          'mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-line-strong accent-primary-600',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-danger',
        )}
        {...rest}
      />
      {(label || description) && (
        <div className="text-sm leading-snug">
          {label && (
            <label htmlFor={inputId} className="cursor-pointer font-medium text-fg">
              {label}
            </label>
          )}
          {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
        </div>
      )}
    </div>
  )
}
