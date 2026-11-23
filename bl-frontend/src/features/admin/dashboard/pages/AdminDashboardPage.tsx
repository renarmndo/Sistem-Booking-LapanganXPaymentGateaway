import { useState } from 'react'
import { CalendarPlus, Lock, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, StatusBadge } from '@/components/shared'
import { Button, Card, CardBody, CardHeader, Input, Skeleton } from '@/components/ui'
import { PayCountdown } from '@/features/booking/components/PayCountdown'
import { useAdminBookings, useAdminDashboardSummary } from '../../hooks/useAdminOps'
import { RevenueChart } from '../components/RevenueChart'
import { SummaryCards } from '../components/SummaryCards'

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultDateRange() {
  const today = new Date()
  const from = new Date(today)
  from.setDate(today.getDate() - 29)
  const to = new Date(today)
  to.setDate(today.getDate() + 30)
  return {
    from: formatLocalDate(from),
    to: formatLocalDate(to),
  }
}

export function AdminDashboardPage() {
  const initial = defaultDateRange()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)

  const summaryQuery = useAdminDashboardSummary(from, to)
  const recentBookingsQuery = useAdminBookings({ page: 1, limit: 5 })
  const summary = summaryQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Petugas Noel Futsal"
        subtitle="Pantau operasional harian, pendapatan, booking menunggu bayar, dan utilisasi lapangan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm">
              <Link to={PATHS.ADMIN_OFFLINE_BOOKING}>
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Booking Offline
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to={PATHS.ADMIN_SCHEDULES}>
                <Lock className="h-4 w-4" aria-hidden="true" />
                Blokir Jadwal
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to={PATHS.ADMIN_TRANSACTIONS}>
                <Receipt className="h-4 w-4" aria-hidden="true" />
                Transaksi
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="dash-from" className="block text-xs font-medium text-fg-muted">
              Dari Tanggal
            </label>
            <Input
              id="dash-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-40"
            />
          </div>
          <div>
            <label htmlFor="dash-to" className="block text-xs font-medium text-fg-muted">
              Sampai Tanggal
            </label>
            <Input
              id="dash-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-40"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const today = formatLocalDate(new Date())
              setFrom(today)
              setTo(today)
            }}
          >
            Hari Ini
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const now = new Date()
              const start = new Date(now.getFullYear(), now.getMonth(), 1)
              const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
              setFrom(formatLocalDate(start))
              setTo(formatLocalDate(end))
            }}
          >
            Bulan Ini
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              const range = defaultDateRange()
              setFrom(range.from)
              setTo(range.to)
            }}
          >
            ±30 Hari
          </Button>
        </div>
      </div>

      <SummaryCards summary={summary} loading={summaryQuery.isLoading} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={summary?.daily_trend ?? []} loading={summaryQuery.isLoading} />
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">Menunggu Pembayaran</h2>
            <p className="text-xs text-fg-muted">Booking online aktif yang belum dibayar</p>
          </CardHeader>
          <CardBody className="space-y-3">
            {summaryQuery.isLoading ? (
              Array.from({ length: 3 }, (_, idx) => <Skeleton key={idx} className="h-14 w-full" />)
            ) : (summary?.pending_bookings ?? []).length === 0 ? (
              <p className="text-xs text-fg-muted">Tidak ada booking yang menunggu pembayaran.</p>
            ) : (
              summary?.pending_bookings.map((pb) => (
                <div
                  key={pb.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface-alt p-2.5 text-xs"
                >
                  <div>
                    <p className="font-mono font-semibold text-ink">{pb.code}</p>
                    <p className="text-fg-muted">{pb.field_name}</p>
                    <CurrencyText value={pb.total_amount} className="font-semibold text-ink" />
                  </div>
                  {pb.expires_at && <PayCountdown expiresAt={pb.expires_at} />}
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-ink">Booking Terbaru</h2>
              <p className="text-xs text-fg-muted">5 reservasi terakhir di Noel Futsal</p>
            </div>
            <Link to={PATHS.ADMIN_BOOKINGS} className="text-xs font-semibold text-primary-800 hover:underline">
              Lihat semua
            </Link>
          </CardHeader>
          <CardBody className="space-y-2.5">
            {recentBookingsQuery.isLoading ? (
              Array.from({ length: 3 }, (_, idx) => <Skeleton key={idx} className="h-12 w-full" />)
            ) : (recentBookingsQuery.data?.items ?? []).length === 0 ? (
              <p className="text-xs text-fg-muted">Belum ada booking.</p>
            ) : (
              recentBookingsQuery.data?.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold text-ink">{item.code}</span>
                    <span className="mx-1.5 text-fg-muted">&middot;</span>
                    <span className="font-medium text-ink">{item.customer_name || 'Pelanggan'}</span>
                    <p className="text-fg-muted">
                      {item.field.name} &middot; {item.booking_date} ({item.start_time}–{item.end_time})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyText value={item.total_amount} className="font-semibold text-ink" />
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">
              Lapangan Terlaris &amp; Jam Tersibuk
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-fg-muted uppercase">
                Lapangan Terlaris
              </p>
              <div className="space-y-1.5 text-xs">
                {(summary?.top_fields ?? []).slice(0, 4).map((f) => (
                  <div key={f.field_id} className="flex items-center justify-between">
                    <span className="font-medium text-ink">{f.field_name}</span>
                    <span className="text-fg-muted">{f.bookings}x</span>
                  </div>
                ))}
                {(summary?.top_fields ?? []).length === 0 && (
                  <p className="text-fg-muted">Belum ada data.</p>
                )}
              </div>
            </div>

            <div className="border-t border-line pt-3">
              <p className="mb-2 text-xs font-semibold tracking-wider text-fg-muted uppercase">
                Jam Tersibuk
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(summary?.peak_hours ?? []).slice(0, 6).map((h) => (
                  <span
                    key={h.hour}
                    className="rounded border border-line bg-surface-alt px-2 py-1 font-mono text-xs text-ink"
                  >
                    {h.hour} ({h.bookings})
                  </span>
                ))}
                {(summary?.peak_hours ?? []).length === 0 && (
                  <p className="text-xs text-fg-muted">Belum ada data.</p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default AdminDashboardPage
