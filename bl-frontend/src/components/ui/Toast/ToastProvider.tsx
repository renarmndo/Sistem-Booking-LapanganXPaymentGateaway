import { useCallback, useMemo, type ReactNode } from 'react'
import { Toaster, toast as sonnerToast } from 'sonner'
import type { ToastContextValue, ToastItem } from './Toast.types'
import { ToastContext } from './useToast'

const DEFAULT_DURATION_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const dismissToast = useCallback((id: string) => {
    sonnerToast.dismiss(id)
  }, [])

  const addToast = useCallback((input: Omit<ToastItem, 'id'>) => {
    const duration = input.duration ?? DEFAULT_DURATION_MS
    const options = input.title
      ? { description: input.message, duration }
      : { duration }
    const heading = input.title ?? input.message

    let id: string | number
    switch (input.variant) {
      case 'success':
        id = sonnerToast.success(heading, options)
        break
      case 'error':
        id = sonnerToast.error(heading, options)
        break
      case 'warning':
        id = sonnerToast.warning(heading, options)
        break
      default:
        id = sonnerToast.info(heading, options)
        break
    }
    return String(id)
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts: [],
      addToast,
      dismissToast,
      success: (message, title) => addToast({ variant: 'success', message, title }),
      error: (message, title) => addToast({ variant: 'error', message, title }),
      warning: (message, title) => addToast({ variant: 'warning', message, title }),
      info: (message, title) => addToast({ variant: 'info', message, title }),
    }),
    [addToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </ToastContext.Provider>
  )
}
