import type { BadgeSize } from '@/components/ui'

export type KnownStatus =
  | 'available'
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'active'
  | 'inactive'
  | 'verified'
  | 'unverified'
  | 'failed'

export interface StatusBadgeProps {
  status: KnownStatus | (string & {})
  label?: string
  size?: BadgeSize
  className?: string
}
