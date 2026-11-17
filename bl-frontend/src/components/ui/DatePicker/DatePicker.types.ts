import type { InputHTMLAttributes, Ref } from 'react'

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean
  ref?: Ref<HTMLInputElement>
}
