import type { ReactNode } from 'react'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: ModalSize
  closeOnBackdrop?: boolean
  closeLabel?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}
