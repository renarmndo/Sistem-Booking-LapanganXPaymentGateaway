import { AlertCircle, ArrowRight, Calendar, Clock, ShieldCheck } from 'lucide-react'
import { CurrencyText } from '@/components/shared'
import { Badge, Button, Card } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import type { SlotAvailability } from '../types/booking.types'

export interface BookingSummaryProps {
  fieldName: string
  surfaceType: string
  capacity: number
  coverUrl?: string
  selectedDate: string
  selectedSlots: SlotAvailability[]
  totalAmount: number
  timeRange: string
  selectionError?: string | null
  onProceed?: () => void
  onClear?: () => void
  isSubmitting?: boolean
}

export function BookingSummary({
  fieldName,
  surfaceType,
  capacity,
  coverUrl,
  selectedDate,
  selectedSlots,
  totalAmount,
  timeRange,
  selectionError,
  onProceed,
  onClear,
  isSubmitting = false,
}: BookingSummaryProps) {
  const hasSelection = selectedSlots.length > 0

  return (
    <Card padding="md" className="space-y-4 lg:sticky lg:top-20">
      <div className="flex items-center gap-3 border-b border-line pb-3.5">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={fieldName}
            className="h-12 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-primary-950 font-display text-xs font-bold text-gold-300">
            NF
          </div>
        )}
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold tracking-wider text-primary-700 uppercase">
            {surfaceType}
          </p>
          <h3 className="truncate font-display text-base font-bold text-ink">{fieldName}</h3>
          <p className="text-xs text-fg-muted">Kapasitas {capacity} pemain</p>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-fg-muted">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            Jadwal Tanggal
          </span>
          <span className="font-semibold text-ink">
            {formatDate(selectedDate, { includeDay: true, shortMonth: true })}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-fg-muted">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Durasi
          </span>
          <span className="font-semibold text-ink">
            {hasSelection ? `${selectedSlots.length} jam (${timeRange})` : 'Belum dipilih'}
          </span>
        </div>
      </div>

      {hasSelection ? (
        <div className="space-y-2 rounded-xl bg-primary-950 p-3.5 text-surface">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-primary-200 uppercase">
              Slot Waktu Terpilih
            </span>
            <Badge variant="gold" size="sm">
              {selectedSlots.length} Jam
            </Badge>
          </div>
          <div className="space-y-1.5 border-t border-primary-800 pt-2 text-xs">
            {selectedSlots.map((slot) => (
              <div key={slot.start_time} className="flex items-center justify-between">
                <span className="font-mono text-primary-100">
                  {slot.start_time} – {slot.end_time}
                </span>
                <CurrencyText value={slot.price} className="font-semibold text-gold-300" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-surface-alt/50 p-3.5 text-center text-xs text-fg-muted">
          Klik slot jam yang tersedia di sebelah kiri untuk memilih jadwal main Anda.
        </div>
      )}

      {selectionError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-soft/60 p-2.5 text-xs text-danger-ink"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
          <span>{selectionError}</span>
        </div>
      )}

      <div className="space-y-1.5 border-t border-line pt-3 text-xs">
        <div className="flex items-center justify-between text-fg-muted">
          <span>Sewa Lapangan ({selectedSlots.length} jam)</span>
          <CurrencyText value={totalAmount} className="font-medium text-ink" />
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-bold tracking-wide text-ink uppercase">Total Pembayaran</span>
          <CurrencyText value={totalAmount} className="text-xl font-extrabold text-ink" />
        </div>
      </div>

      <div className="space-y-2">
        <Button
          fullWidth
          variant="primary"
          disabled={!hasSelection}
          loading={isSubmitting}
          onClick={onProceed}
        >
          <span>{hasSelection ? 'Lanjutkan ke Pembayaran' : 'Pilih Slot Waktu'}</span>
          {hasSelection && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </Button>

        {hasSelection && onClear && (
          <Button type="button" fullWidth size="sm" variant="ghost" onClick={onClear}>
            Reset Pilihan
          </Button>
        )}
      </div>

      <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-fg-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-primary-700" aria-hidden="true" />
        Konfirmasi instan &middot; Midtrans (VA, QRIS, E-Wallet)
      </p>
    </Card>
  )
}
