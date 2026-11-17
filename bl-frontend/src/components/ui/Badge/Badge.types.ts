import type { HTMLAttributes } from 'react'

export type BadgeVariant = 'neutral' | 'primary' | 'gold' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
}
