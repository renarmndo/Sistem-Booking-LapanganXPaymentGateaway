import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { ErrorStateProps } from './ErrorState.types'

export function ErrorState({
  title = 'Terjadi Kesalahan',
  message = 'Gagal memuat data. Silakan coba beberapa saat lagi.',
  onRetry,
  retryLabel = 'Coba Lagi',
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-danger/20 bg-danger-soft/40 p-8 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-danger-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-fg-muted">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  )
}
