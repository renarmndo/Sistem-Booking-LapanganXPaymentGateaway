import { Ban, CalendarX2, Check, CheckCircle2, Clock, Lock } from 'lucide-react'
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
  highlighted?: boolean
  onToggle?: () => void
}

const STATUS_META: Record<
  SlotStatus,
  { label: string; icon: typeof CheckCircle2 }
> = {
  available: { label: 'Tersedia', icon: CheckCircle2 },
  past: { label: 'Lewat', icon: Clock },
  locked: { label: 'Diproses', icon: Lock },
  booked: { label: 'Terisi', icon: CalendarX2 },
  blocked: { label: 'Tutup', icon: Ban },
}

export function SlotItem({
  startTime,
  endTime,
  price,
  status,
  selected = false,
  highlighted = false,
  onToggle,
}: SlotItemProps) {
  const disabled = status !== 'available'
  const meta = STATUS_META[status]
  const StatusIcon = selected ? Check : meta.icon

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        'flex min-h-[78px] flex-col justify-between rounded-md border p-3 text-left transition duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
        highlighted && 'ring-2 ring-gold-400 ring-offset-1 animate-pulse',
        selected
          ? 'border-primary-950 bg-primary-950 text-surface shadow-sm'
          : status === 'available'
            ? 'border-line-strong bg-surface text-fg hover:border-primary-600 hover:bg-primary-50/40'
            : status === 'booked'
              ? 'pattern-hatch cursor-not-allowed border-line bg-surface-alt text-fg-muted opacity-85'
              : status === 'blocked'
                ? 'pattern-blocked cursor-not-allowed border-line bg-surface-alt text-fg-muted opacity-85'
                : status === 'locked'
                  ? 'border-dashed border-warning/60 bg-warning-soft/50 text-warning-ink cursor-not-allowed'
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
          <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{selected ? 'Dipilih' : meta.label}</span>
        </Badge>
      </div>

      <CurrencyText
        value={price}
        className={cn('mt-2 text-sm font-bold', selected ? 'text-gold-300' : 'text-ink')}
      />
    </button>
  )
}
