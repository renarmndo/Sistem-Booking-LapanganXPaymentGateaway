import { CurrencyText } from '@/components/shared'
import { Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { SlotStatus } from '../types/booking.types'

export interface SlotItemProps {
  startTime: string
  endTime: string
  price: number
  status: SlotStatus
  selected?: boolean
  onToggle?: () => void
}

const STATUS_LABELS: Record<SlotStatus, string> = {
  available: 'Tersedia',
  past: 'Lewat',
  locked: 'Diproses',
  booked: 'Terisi',
  blocked: 'Tutup',
}

export function SlotItem({
  startTime,
  endTime,
  price,
  status,
  selected = false,
  onToggle,
}: SlotItemProps) {
  const disabled = status !== 'available'

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'flex min-h-[76px] flex-col justify-between rounded-md border p-3 text-left transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
        selected
          ? 'border-primary-950 bg-primary-950 text-surface shadow-sm'
          : status === 'available'
            ? 'border-line-strong bg-surface text-fg hover:border-primary-600 hover:bg-primary-50/40'
            : status === 'booked'
              ? 'pattern-hatch cursor-not-allowed border-line bg-surface-alt text-fg-muted opacity-80'
              : status === 'blocked'
                ? 'pattern-blocked cursor-not-allowed border-line bg-surface-alt text-fg-muted opacity-80'
                : status === 'locked'
                  ? 'cursor-not-allowed border-warning/40 bg-warning-soft/50 text-warning-ink'
                  : 'cursor-not-allowed border-line bg-surface-alt text-fg-subtle opacity-60',
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">
          {startTime} – {endTime}
        </span>
        <Badge
          size="sm"
          variant={
            selected
              ? 'gold'
              : status === 'available'
                ? 'success'
                : status === 'locked'
                  ? 'warning'
                  : 'neutral'
          }
        >
          {selected ? 'Dipilih' : STATUS_LABELS[status]}
        </Badge>
      </div>

      <CurrencyText
        value={price}
        className={cn('mt-2 text-sm font-bold', selected ? 'text-gold-300' : 'text-ink')}
      />
    </button>
  )
}
