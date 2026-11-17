import { Clock } from 'lucide-react'
import { useCountdown } from '@/hooks/useCountdown'
import { cn } from '@/utils/cn'

export interface PayCountdownProps {
  expiresAt: string | null | undefined
  className?: string
}

export function PayCountdown({ expiresAt, className }: PayCountdownProps) {
  const { remainingSeconds, formatted, isExpired } = useCountdown(expiresAt)

  const urgencyClass = isExpired || remainingSeconds < 60
    ? 'border-danger/40 bg-danger-soft/70 text-danger-ink'
    : remainingSeconds < 300
      ? 'border-warning/50 bg-warning-soft/70 text-warning-ink'
      : 'border-line bg-surface-alt text-ink'

  const shouldAnnounce =
    isExpired || remainingSeconds === 300 || remainingSeconds === 60 || remainingSeconds % 30 === 0

  return (
    <div
      data-urgency={isExpired || remainingSeconds < 60 ? 'critical' : remainingSeconds < 300 ? 'warning' : 'normal'}
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
        urgencyClass,
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-medium">
          {isExpired ? 'Batas waktu pembayaran habis' : 'Sisa waktu pembayaran'}
        </span>
      </div>

      <span className="font-mono text-base font-bold tabular-nums">{formatted}</span>

      <span className="sr-only" aria-live="polite">
        {shouldAnnounce
          ? isExpired
            ? 'Batas waktu pembayaran telah habis.'
            : `Sisa waktu pembayaran ${Math.ceil(remainingSeconds / 60)} menit.`
          : ''}
      </span>
    </div>
  )
}
