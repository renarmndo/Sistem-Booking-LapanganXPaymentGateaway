import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/utils/cn'
import { Spinner } from '../Spinner'
import type { ButtonProps } from './Button.types'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition duration-150 ease-out',
    'active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary-950 text-surface hover:bg-primary-900',
        accent: 'bg-gold-500 text-ink hover:bg-gold-600',
        secondary: 'border border-line-strong bg-surface text-fg hover:bg-surface-alt',
        ghost: 'bg-transparent text-primary-800 hover:bg-primary-50',
        danger: 'bg-danger text-surface hover:bg-danger-ink',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-[52px] px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
)

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    asChild = false,
    type = 'button',
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className)

  if (asChild) {
    return (
      <Slot ref={ref} className={classes} aria-busy={loading || undefined} {...rest}>
        {children}
      </Slot>
    )
  }

  return (
    <button
      ref={ref}
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={classes}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
})
