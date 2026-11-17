export type BookingStatusCode =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'COMPLETED'

export interface BookingStatusMeta {
  label: string
  variant: 'warning' | 'success' | 'neutral' | 'danger' | 'primary'
  description: string
}

export const BOOKING_STATUS_META: Record<BookingStatusCode, BookingStatusMeta> = {
  PENDING_PAYMENT: {
    label: 'Menunggu Pembayaran',
    variant: 'warning',
    description: 'Slot Anda sedang dikunci. Segera selesaikan pembayaran sebelum batas waktu habis.',
  },
  CONFIRMED: {
    label: 'Terkonfirmasi',
    variant: 'success',
    description: 'Pembayaran telah diterima dan jadwal Anda sudah terkunci untuk sesi bermain.',
  },
  EXPIRED: {
    label: 'Kedaluwarsa',
    variant: 'neutral',
    description: 'Batas waktu pembayaran telah berakhir sehingga slot dilepas kembali.',
  },
  CANCELLED: {
    label: 'Dibatalkan',
    variant: 'danger',
    description: 'Pemesanan telah dibatalkan dan slot kembali tersedia.',
  },
  COMPLETED: {
    label: 'Selesai',
    variant: 'primary',
    description: 'Sesi bermain telah selesai dilaksanakan. Terima kasih telah bermain!',
  },
}

export const BOOKING_STATUS_TABS = [
  { id: '', label: 'Semua' },
  { id: 'PENDING_PAYMENT', label: 'Menunggu Bayar' },
  { id: 'CONFIRMED', label: 'Terkonfirmasi' },
  { id: 'COMPLETED', label: 'Selesai' },
  { id: 'CANCELLED', label: 'Dibatalkan' },
  { id: 'EXPIRED', label: 'Kedaluwarsa' },
] as const
