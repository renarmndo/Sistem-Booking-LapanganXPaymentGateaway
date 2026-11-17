import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatCurrency'
import type { CurrencyTextProps } from './CurrencyText.types'

export function CurrencyText({ value, suffix, className }: CurrencyTextProps) {
  return (
    <span className={cn('font-mono tabular-nums', className)}>
      {formatCurrency(value)}
      {suffix && <span className="font-sans text-xs font-normal text-fg-muted"> {suffix}</span>}
    </span>
  )
}
