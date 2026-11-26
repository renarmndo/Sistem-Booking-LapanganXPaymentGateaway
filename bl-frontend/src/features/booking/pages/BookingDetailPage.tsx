import { useState } from 'react'
import { Copy } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, ErrorState, PageLoader, StatusBadge } from '@/components/shared'
import { Button, Card, CardBody, CardHeader, useToast } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import { CancelBookingDialog } from '../components/CancelBookingDialog'
import { PayButton } from '../components/PayButton'
import { PayCountdown } from '../components/PayCountdown'
import { useBookingDetail, useCancelBooking } from '../hooks/useCreateBooking'

export function BookingDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const toast = useToast()
  const detailQuery = useBookingDetail(id)
  const cancelBooking = useCancelBooking()
  const [cancelOpen, setCancelOpen] = useState(false)

  if (detailQuery.isLoading) {
    return <PageLoader label="Memuat detail booking..." />
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <ErrorState
          title="Booking Tidak Ditemukan"
          message="Detail booking tidak tersedia atau Anda tidak memiliki akses."
          onRetry={() => void detailQuery.refetch()}
        />
      </div>
    )
  }

  const booking = detailQuery.data
  const canCancel = booking.status === 'PENDING_PAYMENT'
  const paidAmount = booking.paid_amount ?? 0
  const isPartialDp = booking.payment?.status === 'partial' && paidAmount < booking.total_amount
  const remainingAmount = Math.max(0, booking.total_amount - paidAmount)

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(booking.code)
      toast.success('Kode booking disalin ke clipboard.')
    } catch {
      toast.info(`Kode booking: ${booking.code}`)
    }
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 xl:px-14 2xl:px-16">
      <PageHeader
        title={booking.field?.name || `Booking ${booking.code}`}
        subtitle={`Dibuat pada ${formatDate(booking.created_at, { includeDay: true })}`}
        breadcrumbs={[
          { label: 'Beranda', to: PATHS.HOME },
          { label: 'Booking Saya', to: PATHS.MY_BOOKINGS },
          { label: booking.code },
        ]}
        actions={<StatusBadge status={booking.status} size="md" />}
      />

      {booking.status === 'PENDING_PAYMENT' && <PayCountdown expiresAt={booking.expires_at} />}

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-fg-muted">Kode Booking</p>
            <p className="font-mono text-lg font-bold text-ink">{booking.code}</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => void handleCopyCode()}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Salin Kode</span>
          </Button>
        </CardHeader>

        <CardBody className="space-y-4 text-sm">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <span className="text-fg-muted">Tanggal Main</span>
            <span className="font-semibold text-ink">
              {formatDate(booking.booking_date, { includeDay: true })}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <span className="text-fg-muted">Rentang Waktu</span>
            <span className="font-mono font-semibold text-ink">
              {booking.start_time} – {booking.end_time}
            </span>
          </div>

          <div className="space-y-2 border-b border-line pb-3">
            <p className="text-xs font-semibold text-fg-muted uppercase">Rincian Slot</p>
            {booking.slots.map((slot) => (
              <div key={slot.start_time} className="flex items-center justify-between text-xs">
                <span className="font-mono text-fg">
                  {slot.start_time} – {slot.end_time}
                </span>
                <CurrencyText value={slot.price} className="font-semibold text-ink" />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-fg-muted">Total Pembayaran</span>
            <CurrencyText value={booking.total_amount} className="text-xl font-bold text-ink" />
          </div>

          {booking.payment?.channel && (
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>Channel Pembayaran</span>
              <span className="font-semibold uppercase text-ink">
                {booking.payment.channel.replace(/_/g, ' ')}
              </span>
            </div>
          )}

          {isPartialDp && (
            <div className="space-y-1.5 rounded-lg border border-gold-300 bg-gold-50/80 p-3.5 text-xs text-gold-900">
              <div className="flex items-center justify-between">
                <strong className="text-ink">Pembayaran DP 50% (Belum Lunas)</strong>
                <span className="font-semibold uppercase text-gold-800">DP 50%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sudah Dibayar</span>
                <CurrencyText value={paidAmount} className="font-semibold text-ink" />
              </div>
              <div className="flex items-center justify-between">
                <span>Sisa Pelunasan</span>
                <CurrencyText value={remainingAmount} className="font-bold text-ink" />
              </div>
              <p className="pt-1 text-gold-900">
                Harap lakukan pelunasan sisa pembayaran paling lambat{' '}
                <strong>H-1 jam / 30 menit sebelum jadwal main</strong> di kasir venue.
              </p>
            </div>
          )}

          {booking.status === 'CONFIRMED' && (
            <div className="rounded-md border border-line bg-surface-alt p-3 text-xs text-fg-muted">
              Booking yang sudah dibayar <strong>tidak dapat dibatalkan</strong> dan{' '}
              <strong>tidak ada pengembalian dana</strong>.
            </div>
          )}

          {booking.cancel_reason && (
            <div className="rounded-md bg-surface-alt p-3 text-xs text-fg-muted">
              <strong>Alasan Pembatalan:</strong> {booking.cancel_reason}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <Button asChild variant="secondary">
              <Link to={PATHS.MY_BOOKINGS}>Kembali ke Daftar</Link>
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {booking.status === 'PENDING_PAYMENT' && (
                <PayButton
                  bookingId={booking.id}
                  label="Lanjutkan Bayar"
                  onTriggerPolling={() => void detailQuery.refetch()}
                />
              )}
              {canCancel && (
                <Button variant="danger" onClick={() => setCancelOpen(true)}>
                  Batalkan Booking
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <CancelBookingDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        booking={booking}
        loading={cancelBooking.isPending}
        onConfirm={(reason) => {
          cancelBooking.mutate(
            { id: booking.id, reason },
            { onSuccess: () => setCancelOpen(false) },
          )
        }}
      />
    </div>
  )
}

export default BookingDetailPage
