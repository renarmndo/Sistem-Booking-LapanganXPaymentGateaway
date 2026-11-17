export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  title?: string
  message: string
  duration?: number
}

export interface ToastProps {
  toast: ToastItem
  onDismiss: (id: string) => void
  dismissLabel?: string
}

export interface ToastContextValue {
  toasts: ToastItem[]
  addToast: (input: Omit<ToastItem, 'id'>) => string
  dismissToast: (id: string) => void
  success: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
}
