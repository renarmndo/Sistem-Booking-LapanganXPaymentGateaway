import { useState, type FormEvent } from 'react'
import { AlertCircle } from 'lucide-react'
import { CurrencyText } from '@/components/shared'
import { Button, FormField, Modal, Textarea } from '@/components/ui'
import type { BookingDetail } from '../types/booking.types'

export interface CancelBookingDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  booking: BookingDetail
  loading?: boolean
}

function estimateRefund(booking: BookingDetail): {
  allowed: boolean
  percent: number
  amount: number
  note: string
} {
  if (booking.status === 'PENDING_PAYMENT') {
    return {
      allowed: true,
      percent: 0,
      amount: 0,
      note: 'Booking belum dibayar. Slot akan dilepas kembali secara langsung.',
    }
  }

  const kickoff = new Date(`${booking.booking_date}T${booking.start_time}:00+07:00`).getTime()
  const hoursLeft = (kickoff - Date.now()) / (1000 * 60 * 60)

  if (hoursLeft >= 24) {
    return {
      allowed: true,
      percent: 100,
      amount: booking.total_amount,
      note: 'Pembatalan ≥ 24 jam sebelum kick-off berhak atas refund 100%.',
    }
  }
  if (hoursLeft >= 6) {
    return {
      allowed: true,
      percent: 50,
      amount: Math.floor(booking.total_amount * 0.5),
      note: 'Pembatalan 6–24 jam sebelum kick-off berhak atas refund parsial 50%.',
    }
  }
  return {
    allowed: false,
    percent: 0,
    amount: 0,
    note: 'Pembatalan kurang dari 6 jam sebelum kick-off tidak dapat dilakukan oleh pengguna.',
  }
}

export function CancelBookingDialog({
  open,
  onClose,
  onConfirm,
  booking,
  loading = false,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState('')
  const estimate = estimateRefund(booking)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!estimate.allowed) return
    onConfirm(reason.trim())
  }

  return (
    <Modal open={open} onClose={onClose} title="Batalkan Booking?" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`rounded-md border p-3 text-xs leading-relaxed ${
            estimate.allowed
              ? 'border-warning/40 bg-warning-soft/50 text-warning-ink'
              : 'border-danger/40 bg-danger-soft/60 text-danger-ink'
          }`}
        >
          <p className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{estimate.note}</span>
          </p>
          {estimate.allowed && booking.status === 'CONFIRMED' && (
            <p className="mt-2 font-semibold">
              Estimasi Refund ({estimate.percent}%):{' '}
              <CurrencyText value={estimate.amount} className="font-bold" />
            </p>
          )}
        </div>

        {estimate.allowed && (
          <FormField label="Alasan Pembatalan (Opsional)" htmlFor="cancel-reason">
            <Textarea
              id="cancel-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Jadwal tim berubah"
            />
          </FormField>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Tutup
          </Button>
          {estimate.allowed && (
            <Button type="submit" variant="danger" loading={loading}>
              Konfirmasi Pembatalan
            </Button>
          )}
        </div>
      </form>
    </Modal>
  )
}
