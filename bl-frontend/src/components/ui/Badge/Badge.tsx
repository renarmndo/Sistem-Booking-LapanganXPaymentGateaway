import { cn } from '@/utils/cn'
import type { BadgeProps, BadgeSize, BadgeVariant } from './Badge.types'

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-alt text-fg-muted border-line',
  primary: 'bg-primary-100 text-primary-800 border-primary-200',
  gold: 'bg-gold-100 text-gold-700 border-gold-300',
  success: 'bg-success-soft text-success-ink border-success/20',
  warning: 'bg-warning-soft text-warning-ink border-warning/20',
  danger: 'bg-danger-soft text-danger-ink border-danger/20',
  info: 'bg-info-soft text-info-ink border-info/20',
}

const sizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
