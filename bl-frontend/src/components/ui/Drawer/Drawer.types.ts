import type { ReactNode } from 'react'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  side?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeLabel?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}
