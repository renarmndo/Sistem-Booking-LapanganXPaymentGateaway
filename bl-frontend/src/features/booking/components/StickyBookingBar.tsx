import { CurrencyText } from '@/components/shared'
import { Button } from '@/components/ui'

export interface StickyBookingBarProps {
  slotCount: number
  timeRange: string
  totalAmount: number
  onProceed?: () => void
  isSubmitting?: boolean
}

export function StickyBookingBar({
  slotCount,
  timeRange,
  totalAmount,
  onProceed,
  isSubmitting = false,
}: StickyBookingBarProps) {
  if (slotCount === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium text-fg-muted">
            {slotCount} jam &middot; {timeRange}
          </p>
          <CurrencyText value={totalAmount} className="text-base font-bold text-ink" />
        </div>

        <Button
          variant="accent"
          size="md"
          loading={isSubmitting}
          onClick={onProceed}
          className="shrink-0"
        >
          Lanjutkan Booking
        </Button>
      </div>
    </div>
  )
}
