import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui'
import { cn } from '@/utils/cn'
import type { StatCardProps } from './StatCard.types'

export function StatCard({ label, value, delta, icon, onClick, className }: StatCardProps) {
  const content = (
    <Card
      padding="md"
      interactive={Boolean(onClick)}
      className={cn('text-left', onClick && 'cursor-pointer', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-fg-muted uppercase">{label}</p>
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-800">
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 font-sans text-2xl font-bold text-ink tabular-nums sm:text-3xl">
        {value}
      </p>
      {delta && (
        <p
          className={cn(
            'mt-2 inline-flex items-center gap-1 text-xs font-medium',
            delta.trend === 'up' && 'text-success',
            delta.trend === 'down' && 'text-danger',
            delta.trend === 'neutral' && 'text-fg-muted',
          )}
        >
          {delta.trend === 'up' && <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
          {delta.trend === 'down' && <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>{delta.value}</span>
        </p>
      )}
    </Card>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    )
  }

  return content
}
