import { AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { FormFieldProps } from './FormField.types'

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-fg">
          {label}
          {required && (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : (
        hint && <p className="text-xs text-fg-muted">{hint}</p>
      )}
    </div>
  )
}
