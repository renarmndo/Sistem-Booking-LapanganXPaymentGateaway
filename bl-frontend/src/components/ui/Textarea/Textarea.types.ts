import type { Ref, TextareaHTMLAttributes } from 'react'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  ref?: Ref<HTMLTextAreaElement>
}
