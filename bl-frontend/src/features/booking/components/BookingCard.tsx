import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { CurrencyText, StatusBadge } from '@/components/shared'
import { Card, CardBody } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import type { BookingDetail } from '../types/booking.types'
import { PayButton } from './PayButton'

export interface BookingCardProps {
  booking: BookingDetail
}

export function BookingCard({ booking }: BookingCardProps) {
  return (
    <Card className="transition hover:border-primary-300">
      <CardBody className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-fg-muted">{booking.code}</span>
            <StatusBadge status={booking.status} />
          </div>

          <h3 className="font-display text-base font-bold text-ink">
            {booking.field?.name || `Lapangan #${booking.field?.id ?? ''}`}
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(booking.booking_date, { includeDay: true, shortMonth: true })}
            </span>
            <span className="inline-flex items-center gap-1 font-mono">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {booking.start_time} – {booking.end_time}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
          <CurrencyText value={booking.total_amount} className="text-base font-bold text-ink" />
          <div className="flex items-center gap-3">
            {booking.status === 'PENDING_PAYMENT' && (
              <PayButton bookingId={booking.id} label="Lanjutkan Bayar" size="sm" />
            )}
            <Link
              to={PATHS.BOOKING_DETAIL(booking.id)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-800 hover:underline"
            >
              <span>Detail</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
