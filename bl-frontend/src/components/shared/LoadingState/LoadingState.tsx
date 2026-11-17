import { Skeleton, Spinner } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { LoadingStateProps } from './LoadingState.types'

export function LoadingState({
  variant = 'cards',
  count = 3,
  label = 'Memuat data...',
  className,
}: LoadingStateProps) {
  if (variant === 'spinner') {
    return (
      <div
        role="status"
        aria-label={label}
        className={cn('flex flex-col items-center justify-center gap-3 py-12 text-primary-600', className)}
      >
        <Spinner size="lg" aria-hidden="true" role={undefined} />
        <p className="text-sm text-fg-muted">{label}</p>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div aria-busy="true" aria-label={label} className={cn('space-y-3', className)}>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-3 rounded-md border border-line bg-surface p-4">
            <Skeleton variant="circle" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="w-1/3" />
              <Skeleton variant="text" className="w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      aria-busy="true"
      aria-label={label}
      className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <Skeleton variant="rect" className="h-36" />
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      ))}
    </div>
  )
}
