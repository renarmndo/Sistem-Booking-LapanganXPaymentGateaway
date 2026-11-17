import { useEffect, useId, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { DrawerProps } from './Drawer.types'

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
} as const

export function Drawer({
  open,
  onClose,
  title,
  description,
  side = 'right',
  size = 'sm',
  closeLabel = 'Tutup panel',
  children,
  footer,
  className,
}: DrawerProps) {
  const titleId = useId()
  const [rendered, setRendered] = useState(open)
  const [visible, setVisible] = useState(false)

  if (open && !rendered) {
    setRendered(true)
  }

  useEffect(() => {
    if (open) {
      let frame2 = 0
      const frame1 = requestAnimationFrame(() => {
        frame2 = requestAnimationFrame(() => {
          setVisible(true)
        })
      })
      return () => {
        cancelAnimationFrame(frame1)
        if (frame2) cancelAnimationFrame(frame2)
      }
    }

    const hideFrame = requestAnimationFrame(() => {
      setVisible(false)
    })
    const timer = setTimeout(() => {
      setRendered(false)
    }, 300)
    return () => {
      cancelAnimationFrame(hideFrame)
      clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!rendered) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex',
        side === 'right' ? 'justify-end' : 'justify-start',
      )}
      role="presentation"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 bg-ink/50 transition-opacity duration-300 ease-out',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'pb-safe relative z-10 flex h-full w-full flex-col bg-surface shadow-xl transition-transform duration-300 ease-out will-change-transform',
          visible
            ? 'translate-x-0'
            : side === 'right'
              ? 'translate-x-full'
              : '-translate-x-full',
          sizeClasses[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            {title && (
              <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-xs text-fg-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-surface-alt hover:text-fg"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
