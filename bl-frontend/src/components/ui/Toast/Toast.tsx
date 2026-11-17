import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ToastProps, ToastVariant } from './Toast.types'

const styles: Record<ToastVariant, string> = {
  success: 'border-success/30 bg-surface text-fg',
  error: 'border-danger/30 bg-surface text-fg',
  warning: 'border-warning/30 bg-surface text-fg',
  info: 'border-info/30 bg-surface text-fg',
}

const iconStyles: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

export function Toast({
  toast,
  onDismiss,
  dismissLabel = 'Tutup notifikasi',
}: ToastProps) {
  const Icon = icons[toast.variant]

  return (
    <div
      role="status"
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-md border p-3.5 shadow-md',
        styles[toast.variant],
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconStyles[toast.variant])} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        {toast.title && <p className="font-semibold text-ink">{toast.title}</p>}
        <p className="text-fg-muted">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={dismissLabel}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-fg-muted transition hover:bg-surface-alt hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
