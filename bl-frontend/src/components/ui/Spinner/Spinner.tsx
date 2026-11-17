import { cn } from '@/utils/cn'
import type { SpinnerProps } from './Spinner.types'

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

export function Spinner({
  size = 'md',
  label = 'Memuat...',
  className,
  ...rest
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent',
        sizes[size],
        className,
      )}
      {...rest}
    />
  )
}
