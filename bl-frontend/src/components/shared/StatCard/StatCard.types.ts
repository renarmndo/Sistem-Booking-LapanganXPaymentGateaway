import type { ReactNode } from 'react'

export interface StatDelta {
  value: string
  trend: 'up' | 'down' | 'neutral'
}

export interface StatCardProps {
  label: string
  value: string | number
  delta?: StatDelta
  icon?: ReactNode
  onClick?: () => void
  className?: string
}
