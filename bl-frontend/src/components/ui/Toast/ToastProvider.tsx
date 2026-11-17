import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Toast } from './Toast'
import type { ToastContextValue, ToastItem } from './Toast.types'
import { ToastContext } from './useToast'

const DEFAULT_DURATION_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (input: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const duration = input.duration ?? DEFAULT_DURATION_MS
      setToasts((prev) => [...prev, { ...input, id }])

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissToast(id)
        }, duration)
        timersRef.current.set(id, timer)
      }
      return id
    },
    [dismissToast],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      addToast,
      dismissToast,
      success: (message, title) => addToast({ variant: 'success', message, title }),
      error: (message, title) => addToast({ variant: 'error', message, title }),
      warning: (message, title) => addToast({ variant: 'warning', message, title }),
      info: (message, title) => addToast({ variant: 'info', message, title }),
    }),
    [toasts, addToast, dismissToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 left-4 z-50 flex flex-col items-center gap-2 sm:left-auto sm:w-full sm:max-w-sm sm:items-end"
      >
        {toasts.map((item) => (
          <Toast key={item.id} toast={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
