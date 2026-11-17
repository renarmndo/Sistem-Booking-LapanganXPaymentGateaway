import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared'
import { Button, Pagination, Tabs } from '@/components/ui'
import { BOOKING_STATUS_TABS } from '@/constants/bookingStatus'
import { BookingCard } from '../components/BookingCard'
import { useMyBookings } from '../hooks/useCreateBooking'

export function MyBookingsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const bookingsQuery = useMyBookings({
    status: status || undefined,
    page,
    limit: 10,
  })

  const items = bookingsQuery.data?.items ?? []
  const meta = bookingsQuery.data?.meta

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 xl:px-14 2xl:px-16">
      <PageHeader
        title="Booking Saya"
        subtitle="Pantau status pemesanan, batas waktu pembayaran, dan riwayat jadwal bermain."
        breadcrumbs={[{ label: 'Beranda', to: PATHS.HOME }, { label: 'Booking Saya' }]}
        actions={
          <Button asChild variant="accent" size="sm">
            <Link to={PATHS.FIELDS}>Booking Baru</Link>
          </Button>
        }
      />

      <Tabs
        activeId={status}
        onChange={(nextStatus) => {
          setStatus(nextStatus)
          setPage(1)
        }}
        items={[...BOOKING_STATUS_TABS]}
      />

      {bookingsQuery.isLoading ? (
        <LoadingState variant="list" count={4} label="Memuat riwayat booking..." />
      ) : bookingsQuery.isError ? (
        <ErrorState
          message="Gagal memuat riwayat booking Anda."
          onRetry={() => void bookingsQuery.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Belum ada riwayat booking"
          description="Pemesanan lapangan yang Anda buat akan tampil di halaman ini."
          action={
            <Button asChild variant="primary">
              <Link to={PATHS.FIELDS}>Jelajahi Lapangan</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {items.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>

          {meta && meta.total_pages > 1 && (
            <Pagination
              page={meta.page}
              totalPages={meta.total_pages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default MyBookingsPage
