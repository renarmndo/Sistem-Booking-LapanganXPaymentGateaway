import type { InputHTMLAttributes, Ref } from 'react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  error?: boolean
  ref?: Ref<HTMLInputElement>
}
