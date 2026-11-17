import { Spinner } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { PageLoaderProps } from './PageLoader.types'

export function PageLoader({ label = 'Memuat halaman...', className }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 text-primary-600',
        className,
      )}
    >
      <Spinner size="lg" aria-hidden="true" role={undefined} />
      <p className="text-sm font-medium text-fg-muted">{label}</p>
    </div>
  )
}
