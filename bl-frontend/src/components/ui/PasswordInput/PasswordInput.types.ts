import type { InputHTMLAttributes, Ref } from 'react'

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean
  showLabel?: string
  hideLabel?: string
  ref?: Ref<HTMLInputElement>
}
