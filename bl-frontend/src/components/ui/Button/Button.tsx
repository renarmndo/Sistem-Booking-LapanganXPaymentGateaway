import { cn } from '@/utils/cn'
import { Spinner } from '../Spinner'
import type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-950 text-surface hover:bg-primary-900',
  accent: 'bg-gold-500 text-ink hover:bg-gold-600',
  secondary: 'border border-line-strong bg-surface text-fg hover:bg-surface-alt',
  ghost: 'bg-transparent text-primary-800 hover:bg-primary-50',
  danger: 'bg-danger text-surface hover:bg-danger-ink',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-[52px] px-6 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  type = 'button',
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition duration-150 ease-out',
        'active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
