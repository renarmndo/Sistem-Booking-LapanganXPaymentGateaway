import type { HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
}

export type CardSectionProps = HTMLAttributes<HTMLDivElement>
