import { cn } from '@/utils/cn'
import type { CardProps, CardSectionProps } from './Card.types'

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

export function Card({
  padding = 'md',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface shadow-xs',
        interactive && 'transition duration-150 ease-out hover:shadow-md',
        paddings[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...rest }: CardSectionProps) {
  return (
    <div className={cn('border-b border-line pb-4', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardBody({ className, children, ...rest }: CardSectionProps) {
  return (
    <div className={cn('py-4', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...rest }: CardSectionProps) {
  return (
    <div className={cn('border-t border-line pt-4', className)} {...rest}>
      {children}
    </div>
  )
}
