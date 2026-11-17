import type { ReactNode } from 'react'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  side?: 'left' | 'right'
  closeLabel?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}
