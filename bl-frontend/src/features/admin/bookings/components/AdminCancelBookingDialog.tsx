import { useState, type FormEvent } from 'react'
import { Button, FormField, Input, Modal, Textarea } from '@/components/ui'
import { useAdminCancelBooking } from '../../hooks/useAdminOps'
import type { AdminBookingItem } from '../../types/adminOps.types'

export interface AdminCancelBookingDialogProps {
  booking: AdminBookingItem | null
  onClose: () => void
}

export function AdminCancelBookingDialog({ booking, onClose }: AdminCancelBookingDialogProps) {
  return (
    <Modal
      open={booking !== null}
      onClose={onClose}
      title="Batalkan Booking (Petugas)"
      description={booking ? `Kode ${booking.code} · ${booking.customer_name}` : ''}
      size="sm"
    >
      {booking ? (
        <AdminCancelForm key={booking.id} booking={booking} onClose={onClose} />
      ) : null}
    </Modal>
  )
}

function AdminCancelForm({ booking, onClose }: { booking: AdminBookingItem; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [createRefund, setCreateRefund] = useState(booking.status === 'CONFIRMED')
  const [refundAmount, setRefundAmount] = useState(booking.total_amount)
  const cancelMutation = useAdminCancelBooking()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    cancelMutation.mutate(
      {
        bookingId: booking.id,
        payload: {
          reason: reason.trim(),
          create_refund: createRefund,
          refund_amount: createRefund ? refundAmount : 0,
        },
      },
      { onSuccess: () => onClose() },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField label="Alasan Pembatalan (Wajib)" htmlFor="admin-cancel-reason" required>
        <Textarea
          id="admin-cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Contoh: Hujan deras / Permintaan pelanggan langsung"
          required
        />
      </FormField>

      {booking.status === 'CONFIRMED' && (
        <div className="space-y-2 rounded-md border border-line bg-surface-alt p-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-ink">
            <input
              type="checkbox"
              checked={createRefund}
              onChange={(e) => setCreateRefund(e.target.checked)}
              className="h-4 w-4 accent-primary-900"
            />
            <span>Buat permintaan refund untuk pelanggan</span>
          </label>
          {createRefund && (
            <FormField label="Nominal Refund (Rp)" htmlFor="admin-refund-amt">
              <Input
                id="admin-refund-amt"
                type="number"
                min={0}
                max={booking.total_amount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value) || 0)}
              />
            </FormField>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Kembali
        </Button>
        <Button
          type="submit"
          variant="danger"
          loading={cancelMutation.isPending}
          disabled={reason.trim().length < 3}
        >
          Konfirmasi Pembatalan
        </Button>
      </div>
    </form>
  )
}
