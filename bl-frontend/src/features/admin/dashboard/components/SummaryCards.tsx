import { AlertTriangle, Banknote, CalendarCheck2, Clock } from 'lucide-react'
import { CurrencyText } from '@/components/shared'
import { Card, CardBody, Skeleton } from '@/components/ui'
import type { AdminDashboardSummary } from '../../types/adminOps.types'

export interface SummaryCardsProps {
  summary: AdminDashboardSummary | undefined
  loading: boolean
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, idx) => (
          <Card key={idx}>
            <CardBody className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardBody>
          </Card>
        ))}
      </div>
    )
  }

  const confirmedCount =
    (summary.status_counts.CONFIRMED ?? 0) + (summary.status_counts.COMPLETED ?? 0)
  const pendingCount = summary.status_counts.PENDING_PAYMENT ?? 0

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <Card>
        <CardBody className="space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted">
            <span>Pendapatan (Lunas)</span>
            <Banknote className="h-4 w-4 text-primary-700" aria-hidden="true" />
          </div>
          <p className="text-lg font-bold text-ink sm:text-2xl">
            <CurrencyText value={summary.paid_revenue} />
          </p>
          <p className="text-[11px] text-fg-muted">
            {summary.from} s/d {summary.to}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted">
            <span>Total Booking</span>
            <CalendarCheck2 className="h-4 w-4 text-primary-700" aria-hidden="true" />
          </div>
          <p className="text-lg font-bold text-ink sm:text-2xl">{summary.total_bookings}</p>
          <p className="text-[11px] text-fg-muted">
            Online {summary.online_bookings} &middot; Offline {summary.offline_bookings}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted">
            <span>Terkonfirmasi / Pending</span>
            <Clock className="h-4 w-4 text-gold-600" aria-hidden="true" />
          </div>
          <p className="text-lg font-bold text-ink sm:text-2xl">
            {confirmedCount}{' '}
            <span className="text-sm font-medium text-fg-muted">/ {pendingCount} pending</span>
          </p>
          <p className="text-[11px] text-fg-muted">
            Batal: {summary.status_counts.CANCELLED ?? 0} &middot; Expired:{' '}
            {summary.status_counts.EXPIRED ?? 0}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-fg-muted">
            <span>Perlu Tinjauan</span>
            <AlertTriangle
              className={`h-4 w-4 ${summary.needs_review_count > 0 ? 'text-warning' : 'text-fg-muted'}`}
              aria-hidden="true"
            />
          </div>
          <p className="text-lg font-bold text-ink sm:text-2xl">{summary.needs_review_count}</p>
          <p className="text-[11px] text-fg-muted">Transaksi flagged needs_review</p>
        </CardBody>
      </Card>
    </div>
  )
}
