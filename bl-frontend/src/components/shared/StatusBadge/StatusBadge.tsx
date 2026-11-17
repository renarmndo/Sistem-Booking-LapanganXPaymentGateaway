import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Badge, type BadgeVariant } from '@/components/ui'
import { BOOKING_STATUS_META } from '@/constants/bookingStatus'
import type { StatusBadgeProps } from './StatusBadge.types'

interface StatusConfig {
  label: string
  variant: BadgeVariant
  icon: typeof CheckCircle2
}

const STATUS_MAP: Record<string, StatusConfig> = {
  available: { label: 'Tersedia', variant: 'success', icon: CheckCircle2 },
  pending: { label: BOOKING_STATUS_META.PENDING_PAYMENT.label, variant: BOOKING_STATUS_META.PENDING_PAYMENT.variant, icon: Clock },
  pending_payment: { label: BOOKING_STATUS_META.PENDING_PAYMENT.label, variant: BOOKING_STATUS_META.PENDING_PAYMENT.variant, icon: Clock },
  confirmed: { label: BOOKING_STATUS_META.CONFIRMED.label, variant: BOOKING_STATUS_META.CONFIRMED.variant, icon: CheckCircle2 },
  paid: { label: 'Lunas', variant: 'success', icon: CheckCircle2 },
  completed: { label: BOOKING_STATUS_META.COMPLETED.label, variant: BOOKING_STATUS_META.COMPLETED.variant, icon: ShieldCheck },
  cancelled: { label: BOOKING_STATUS_META.CANCELLED.label, variant: BOOKING_STATUS_META.CANCELLED.variant, icon: XCircle },
  expired: { label: BOOKING_STATUS_META.EXPIRED.label, variant: BOOKING_STATUS_META.EXPIRED.variant, icon: Clock },
  refunded: { label: 'Refund', variant: 'info', icon: RefreshCw },
  active: { label: 'Aktif', variant: 'success', icon: CheckCircle2 },
  inactive: { label: 'Nonaktif', variant: 'neutral', icon: Ban },
  verified: { label: 'Terverifikasi', variant: 'success', icon: ShieldCheck },
  unverified: { label: 'Belum Verifikasi', variant: 'warning', icon: AlertCircle },
  failed: { label: 'Gagal', variant: 'danger', icon: XCircle },
}

export function StatusBadge({ status, label, size = 'sm', className }: StatusBadgeProps) {
  const key = status.toLowerCase()
  const config = STATUS_MAP[key] ?? {
    label: status,
    variant: 'neutral' as BadgeVariant,
    icon: AlertCircle,
  }
  const Icon = config.icon

  return (
    <Badge variant={config.variant} size={size} className={className}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label ?? config.label}</span>
    </Badge>
  )
}
