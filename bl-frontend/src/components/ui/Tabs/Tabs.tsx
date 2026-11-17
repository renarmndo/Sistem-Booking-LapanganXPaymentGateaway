import { cn } from '@/utils/cn'
import type { TabsProps } from './Tabs.types'

export function Tabs({ items, activeId, onChange, className }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-line',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isActive
                ? 'border-gold-500 font-semibold text-ink'
                : 'border-transparent font-medium text-fg-muted hover:text-fg',
            )}
          >
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 font-mono text-[11px]',
                  isActive ? 'bg-primary-950 text-surface' : 'bg-surface-alt text-fg-muted',
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
