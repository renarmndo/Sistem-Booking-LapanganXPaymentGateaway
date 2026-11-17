import { cn } from '@/utils/cn'
import { getPasswordStrength, type PasswordStrength } from '../schemas/auth.schema'

const barColors: Record<PasswordStrength['tone'], string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
}

const textColors: Record<PasswordStrength['tone'], string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
  success: 'text-success',
}

export interface PasswordStrengthIndicatorProps {
  password: string
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null

  const { score, label, tone } = getPasswordStrength(password)

  return (
    <div className="mt-2 space-y-1" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1.5 rounded-full transition-colors',
              step <= score ? barColors[tone] : 'bg-line',
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs font-medium', textColors[tone])}>
        Kekuatan kata sandi: {label}
      </p>
    </div>
  )
}
