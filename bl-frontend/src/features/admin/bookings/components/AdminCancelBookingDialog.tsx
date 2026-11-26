import { useState, type FormEvent } from 'react'
import { Button, FormField, Modal, Textarea } from '@/components/ui'
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
  const cancelMutation = useAdminCancelBooking()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    cancelMutation.mutate(
      {
        bookingId: booking.id,
        payload: {
          reason: reason.trim(),
          create_refund: false,
          refund_amount: 0,
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
          placeholder="Contoh: Hujan deras / Penjadwalan ulang dari pengelola"
          required
        />
      </FormField>

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
