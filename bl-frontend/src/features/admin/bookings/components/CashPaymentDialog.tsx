import { useState, type FormEvent } from 'react'
import { CurrencyText } from '@/components/shared'
import { Button, FormField, Input, Modal, Select, Textarea } from '@/components/ui'
import { useRecordAdminPayment } from '../../hooks/useAdminOps'
import type { AdminBookingItem } from '../../types/adminOps.types'

export interface CashPaymentDialogProps {
  booking: AdminBookingItem | null
  onClose: () => void
}

export function CashPaymentDialog({ booking, onClose }: CashPaymentDialogProps) {
  return (
    <Modal
      open={booking !== null}
      onClose={onClose}
      title="Catat Pembayaran Tunai / Manual"
      description={booking ? `Booking ${booking.code} · ${booking.customer_name}` : ''}
      size="sm"
    >
      {booking ? (
        <CashPaymentForm key={booking.id} booking={booking} onClose={onClose} />
      ) : null}
    </Modal>
  )
}

function CashPaymentForm({ booking, onClose }: { booking: AdminBookingItem; onClose: () => void }) {
  const remaining = Math.max(0, booking.total_amount - booking.paid_amount)
  const [amount, setAmount] = useState(remaining)
  const [method, setMethod] = useState<'cash' | 'transfer_manual'>('cash')
  const [note, setNote] = useState('')
  const recordPayment = useRecordAdminPayment()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    recordPayment.mutate(
      { bookingId: booking.id, payload: { amount, method, note: note.trim() || undefined } },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md bg-surface-alt p-3 text-xs">
        <div className="flex justify-between">
          <span className="text-fg-muted">Total Tagihan</span>
          <CurrencyText value={booking.total_amount} className="font-semibold text-ink" />
        </div>
        <div className="mt-1 flex justify-between">
          <span className="text-fg-muted">Sisa Tagihan</span>
          <CurrencyText value={remaining} className="font-bold text-primary-900" />
        </div>
      </div>

      <FormField label="Nominal Pembayaran" htmlFor="cash-amt" required>
        <Input
          id="cash-amt"
          type="number"
          min={1}
          max={remaining}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          required
        />
      </FormField>

      <FormField label="Metode" htmlFor="cash-method">
        <Select
          id="cash-method"
          value={method}
          onChange={(e) => setMethod(e.target.value as 'cash' | 'transfer_manual')}
          options={[
            { value: 'cash', label: 'Tunai (Cash)' },
            { value: 'transfer_manual', label: 'Transfer Manual' },
          ]}
        />
      </FormField>

      <FormField label="Catatan (Opsional)" htmlFor="cash-note">
        <Textarea
          id="cash-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Contoh: Pelunasan sebelum main"
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" loading={recordPayment.isPending} disabled={amount <= 0 || amount > remaining}>
          Simpan Pembayaran
        </Button>
      </div>
    </form>
  )
}
