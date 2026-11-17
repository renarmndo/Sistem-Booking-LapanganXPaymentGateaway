import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, ErrorState, PageLoader, StatusBadge } from '@/components/shared'
import { Button, Card, CardBody, CardHeader, useToast } from '@/components/ui'
import { BOOKING_STATUS_META, type BookingStatusCode } from '@/constants/bookingStatus'
import { formatDate } from '@/utils/formatDate'
import { getErrorMessage } from '@/utils/error'
import { bookingApi } from '../api/booking.api'
import { PaymentStatusPanel } from '../components/PaymentStatusPanel'
import { usePaymentPolling } from '../hooks/usePaymentPolling'
import type { CreateBookingResponse } from '../types/booking.types'

interface StatusLocationState {
  createdBooking?: CreateBookingResponse
}

export function PaymentStatusPage() {
  const { id = '' } = useParams<{ id: string }>()
  const location = useLocation()
  const toast = useToast()
  const state = location.state as StatusLocationState | null
  const created = state?.createdBooking

  const {
    booking,
    isLoading,
    isError,
    refetch,
    isPolling,
    startPolling,
  } = usePaymentPolling(id)
  const [isSyncing, setIsSyncing] = useState(false)

  if (isLoading && !created) {
    return <PageLoader label="Memuat status booking..." />
  }

  if (isError && !created) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <ErrorState
          title="Booking Tidak Ditemukan"
          message="Gagal memuat status booking."
          onRetry={() => void refetch()}
        />
      </div>
    )
  }

  const code = booking?.code ?? created?.code ?? `#${id}`
  const totalAmount = booking?.total_amount ?? created?.total ?? 0
  const expiresAt = booking?.expires_at ?? created?.expires_at ?? null
  const status = (booking?.status ?? 'PENDING_PAYMENT') as BookingStatusCode
  const meta = BOOKING_STATUS_META[status] ?? BOOKING_STATUS_META.PENDING_PAYMENT

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      await bookingApi.syncPayment(id)
      await refetch()
      toast.info('Status pembayaran telah diperbarui.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyinkronkan status pembayaran.'))
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 xl:px-14 2xl:px-16">
      <PageHeader
        title={`Status Booking ${code}`}
        subtitle={meta.description}
        breadcrumbs={[
          { label: 'Beranda', to: PATHS.HOME },
          { label: 'Booking Saya', to: PATHS.MY_BOOKINGS },
          { label: code },
        ]}
        actions={<StatusBadge status={status} size="md" />}
      />

      <PaymentStatusPanel
        bookingId={id}
        status={status}
        expiresAt={expiresAt}
        initialToken={created?.payment?.token}
        isVerifying={isPolling}
        onTriggerPolling={startPolling}
        onManualSync={() => void handleManualSync()}
        isSyncing={isSyncing}
      />

      <Card>
        <CardHeader>
          <p className="font-mono text-xs font-semibold text-fg-muted uppercase">
            Kode Referensi: {code}
          </p>
          {booking?.field && (
            <h2 className="mt-1 font-display text-lg font-bold text-ink">{booking.field.name}</h2>
          )}
        </CardHeader>
        <CardBody className="space-y-4 text-sm">
          {booking && (
            <>
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-fg-muted">Tanggal Main</span>
                <span className="font-semibold text-ink">
                  {formatDate(booking.booking_date, { includeDay: true })}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-fg-muted">Jam</span>
                <span className="font-mono font-semibold text-ink">
                  {booking.start_time} – {booking.end_time}
                </span>
              </div>
              {booking.payment?.channel && (
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <span className="text-fg-muted">Channel Pembayaran</span>
                  <span className="font-mono font-semibold uppercase text-ink">
                    {booking.payment.channel}
                  </span>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <span className="text-fg-muted">Total Pembayaran</span>
            <CurrencyText value={totalAmount} className="text-lg font-bold text-ink" />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild variant="primary">
              <Link to={PATHS.MY_BOOKINGS}>Lihat Booking Saya</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to={PATHS.FIELDS}>Cari Lapangan Lain</Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

export default PaymentStatusPage
