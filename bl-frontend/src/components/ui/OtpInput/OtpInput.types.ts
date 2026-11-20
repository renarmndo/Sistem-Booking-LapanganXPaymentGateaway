export interface OtpInputProps {
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  length?: number
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
  className?: string
}
