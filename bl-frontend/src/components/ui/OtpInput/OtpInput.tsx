import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/utils/cn'
import type { OtpInputProps } from './OtpInput.types'

export function OtpInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = false,
  className,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  const sanitizedValue = value.replace(/\D/g, '').slice(0, length)
  const digits = Array.from({ length }, (_, index) => sanitizedValue[index] ?? '')

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRefs.current[0]?.focus()
    }
  }, [autoFocus, disabled])

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index))
    const el = inputRefs.current[clamped]
    if (el) {
      el.focus()
      el.select()
    }
  }

  const updateDigitAt = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, '')

    if (incoming.length === 0) {
      const next = [...digits]
      next[index] = ''
      onChange(next.join(''))
      return
    }

    if (incoming.length >= length) {
      onChange(incoming.slice(0, length))
      focusBox(length - 1)
      return
    }

    // Replacing a single digit in an already-filled box without prior selection
    if (incoming.length === 2 && digits[index]) {
      const newDigit = incoming[0] === digits[index] ? incoming[1] : incoming[0]
      const next = [...digits]
      next[index] = newDigit
      onChange(next.join(''))
      if (index < length - 1) {
        focusBox(index + 1)
      }
      return
    }

    // Single digit or partial multi-digit fill (e.g. autofill)
    const next = [...digits]
    let cursor = index
    for (const ch of incoming) {
      if (cursor >= length) break
      next[cursor] = ch
      cursor += 1
    }
    onChange(next.join(''))
    focusBox(Math.min(cursor, length - 1))
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        e.preventDefault()
        const next = [...digits]
        next[index] = ''
        onChange(next.join(''))
      } else if (index > 0) {
        e.preventDefault()
        const next = [...digits]
        next[index - 1] = ''
        onChange(next.join(''))
        focusBox(index - 1)
      }
      return
    }

    if (e.key === 'Delete') {
      e.preventDefault()
      const next = [...digits]
      next[index] = ''
      onChange(next.join(''))
      return
    }

    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      focusBox(index - 1)
      return
    }

    if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault()
      focusBox(index + 1)
      return
    }

    if (e.key === 'Home') {
      e.preventDefault()
      focusBox(0)
      return
    }

    if (e.key === 'End') {
      e.preventDefault()
      focusBox(length - 1)
    }
  }

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return

    if (pasted.length >= length) {
      onChange(pasted.slice(0, length))
      focusBox(length - 1)
      return
    }

    const next = [...digits]
    let cursor = index
    for (const ch of pasted) {
      if (cursor >= length) break
      next[cursor] = ch
      cursor += 1
    }
    onChange(next.join(''))
    focusBox(Math.min(cursor, length - 1))
  }

  return (
    <div
      role="group"
      aria-label={id ? undefined : `Input OTP ${length} digit`}
      className={cn('grid grid-cols-6 gap-2 sm:gap-3', className)}
    >
      {digits.map((digit, index) => {
        const isFilled = Boolean(digit)
        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el
            }}
            id={index === 0 ? id : id ? `${id}-${index + 1}` : undefined}
            name={name ? `${name}-${index + 1}` : undefined}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={index === 0 && id ? undefined : `Digit OTP ke-${index + 1}`}
            aria-invalid={error || undefined}
            disabled={disabled}
            value={digit}
            onChange={(e) => updateDigitAt(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(index, e)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => {
              const nextFocused = e.relatedTarget as Node | null
              const staysInside = inputRefs.current.some((el) => el && el === nextFocused)
              if (!staysInside) {
                onBlur?.()
              }
            }}
            className={cn(
              'h-12 w-full rounded-lg border text-center font-mono text-xl font-bold text-ink shadow-xs transition-all duration-150 sm:h-14 sm:text-2xl',
              'focus:outline-none focus:ring-4',
              'disabled:cursor-not-allowed disabled:bg-surface-alt disabled:opacity-60',
              error
                ? 'border-danger bg-danger-soft/30 text-danger-ink focus:border-danger focus:ring-danger/20'
                : isFilled
                  ? 'border-primary-600/70 bg-primary-50/40 text-primary-900 focus:border-primary-600 focus:bg-surface focus:ring-primary-200/70'
                  : 'border-line-strong bg-surface focus:border-primary-600 focus:ring-primary-200/70',
            )}
          />
        )
      })}
    </div>
  )
}
