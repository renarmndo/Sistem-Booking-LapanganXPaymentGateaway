import { EmptyState, ErrorState, LoadingState } from '@/components/shared'
import type { SlotAvailability } from '../types/booking.types'
import { SlotItem } from './SlotItem'

export interface SlotGridProps {
  slots: SlotAvailability[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  selectedTimes?: string[]
  highlightedTimes?: string[]
  onToggleSlot?: (slot: SlotAvailability) => void
}

export function SlotGrid({
  slots,
  isLoading,
  isError,
  onRetry,
  selectedTimes = [],
  highlightedTimes = [],
  onToggleSlot,
}: SlotGridProps) {
  if (isLoading) {
    return <LoadingState variant="list" count={4} label="Memuat jadwal slot..." />
  }

  if (isError) {
    return (
      <ErrorState
        message="Gagal memuat ketersediaan jadwal."
        onRetry={onRetry}
      />
    )
  }

  if (slots.length === 0) {
    return (
      <EmptyState
        title="Lapangan tutup pada tanggal ini"
        description="Silakan pilih tanggal lain untuk melihat jam operasional yang tersedia."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
      {slots.map((slot) => (
        <SlotItem
          key={slot.start_time}
          startTime={slot.start_time}
          endTime={slot.end_time}
          price={slot.price}
          status={slot.status}
          selected={selectedTimes.includes(slot.start_time)}
          highlighted={highlightedTimes.includes(slot.start_time)}
          onToggle={onToggleSlot ? () => onToggleSlot(slot) : undefined}
        />
      ))}
    </div>
  )
}
