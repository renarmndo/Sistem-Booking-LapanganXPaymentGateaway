import type { Ref, SelectHTMLAttributes } from 'react'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[]
  placeholder?: string
  error?: boolean
  ref?: Ref<HTMLSelectElement>
}
