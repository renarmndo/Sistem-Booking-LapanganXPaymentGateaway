import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Input } from '../Input'
import type { PasswordInputProps } from './PasswordInput.types'

export function PasswordInput({
  error = false,
  showLabel = 'Tampilkan kata sandi',
  hideLabel = 'Sembunyikan kata sandi',
  className,
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        error={error}
        className={cn('pr-11', className)}
        {...rest}
      />
      <button
        type="button"
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        onClick={() => setVisible((prev) => !prev)}
        className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-fg-muted transition hover:bg-surface-alt hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  )
}
