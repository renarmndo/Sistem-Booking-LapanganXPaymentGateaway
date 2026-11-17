import { CheckCircle2, Clock, RefreshCw, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { Button, Spinner } from '@/components/ui'
import type { BookingStatus } from '../types/booking.types'
import { PayButton } from './PayButton'
import { PayCountdown } from './PayCountdown'

export interface PaymentStatusPanelProps {
  bookingId: number | string
  status: BookingStatus
  expiresAt?: string | null
  initialToken?: string
  isVerifying: boolean
  onTriggerPolling: () => void
  onManualSync: () => void
  isSyncing?: boolean
}

export function PaymentStatusPanel({
  bookingId,
  status,
  expiresAt,
  initialToken,
  isVerifying,
  onTriggerPolling,
  onManualSync,
  isSyncing = false,
}: PaymentStatusPanelProps) {
  if (status === 'CONFIRMED' || status === 'COMPLETED') {
    return (
      <div className="space-y-4 rounded-xl border border-success/30 bg-success-soft/50 p-5 text-success-ink">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display text-lg font-bold">Pembayaran Berhasil</h2>
            <p className="mt-1 text-sm">
              Jadwal lapangan Anda sudah terkonfirmasi. Tunjukkan kode booking di venue saat datang.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="primary" size="sm">
            <Link to={PATHS.BOOKING_DETAIL(bookingId)}>Lihat Detail Booking</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to={PATHS.MY_BOOKINGS}>Riwayat Booking</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (status === 'CANCELLED') {
    return (
      <div className="space-y-4 rounded-xl border border-danger/30 bg-danger-soft/50 p-5 text-danger-ink">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-display text-lg font-bold">Pembayaran Gagal / Dibatalkan</h2>
            <p className="mt-1 text-sm">
              Pemesanan dibatalkan dan slot telah dilepas kembali ke katalog.
            </p>
          </div>
        </div>
        <Button asChild variant="primary" size="sm">
          <Link to={PATHS.FIELDS}>Cari Jadwal Lain</Link>
        </Button>
      </div>
    )
  }

  if (status === 'EXPIRED') {
    return (
      <div className="space-y-4 rounded-xl border border-line bg-surface-alt p-5 text-fg">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Waktu Pembayaran Habis</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Batas waktu 15 menit telah berakhir sehingga slot dibuka kembali untuk pengguna lain.
            </p>
          </div>
        </div>
        <Button asChild variant="accent" size="sm">
          <Link to={PATHS.FIELDS}>Pesan Ulang</Link>
        </Button>
      </div>
    )
  }

  if (isVerifying) {
    return (
      <div className="space-y-4 rounded-xl border border-primary-300 bg-primary-50/70 p-5 text-primary-900">
        <div className="flex items-center gap-3">
          <Spinner size="md" />
          <div>
            <h2 className="font-display text-base font-bold">Memverifikasi Pembayaran...</h2>
            <p className="text-xs text-primary-800">
              Sedang menunggu konfirmasi resmi dari server pembayaran. Halaman akan diperbarui
              otomatis.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          loading={isSyncing}
          onClick={onManualSync}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Periksa Status Sekarang</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PayCountdown expiresAt={expiresAt} />
      <div className="flex flex-wrap items-center gap-3">
        <PayButton
          bookingId={bookingId}
          initialToken={initialToken}
          onTriggerPolling={onTriggerPolling}
          label="Bayar Sekarang"
          size="lg"
        />
        <Button
          type="button"
          variant="secondary"
          size="md"
          loading={isSyncing}
          onClick={onManualSync}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span>Cek Status Pembayaran</span>
        </Button>
      </div>
    </div>
  )
}
