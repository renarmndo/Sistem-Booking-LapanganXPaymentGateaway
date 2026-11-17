import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { DrawerProps } from './Drawer.types'

export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  closeLabel = 'Tutup panel',
  children,
  footer,
  className,
}: DrawerProps) {
  const titleId = useId()

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

  if (!open) return null

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
        className="fixed inset-0 bg-ink/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'pb-safe relative z-10 flex h-full w-full max-w-sm flex-col bg-surface shadow-lg',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          {title && (
            <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
              {title}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-surface-alt hover:text-fg"
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
