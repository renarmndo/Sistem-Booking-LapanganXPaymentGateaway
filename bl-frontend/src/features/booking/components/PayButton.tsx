import { CreditCard } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui'
import { useSnapPay } from '../hooks/useSnapPay'

export interface PayButtonProps extends Omit<ButtonProps, 'onClick' | 'loading'> {
  bookingId: number | string
  initialToken?: string
  onTriggerPolling?: () => void
  label?: string
}

export function PayButton({
  bookingId,
  initialToken,
  onTriggerPolling,
  label = 'Bayar Sekarang',
  variant = 'accent',
  ...rest
}: PayButtonProps) {
  const { openSnap, isOpening } = useSnapPay({
    bookingId,
    initialToken,
    onTriggerPolling,
  })

  return (
    <Button
      type="button"
      variant={variant}
      loading={isOpening}
      onClick={() => void openSnap()}
      {...rest}
    >
      <CreditCard className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
    </Button>
  )
}
