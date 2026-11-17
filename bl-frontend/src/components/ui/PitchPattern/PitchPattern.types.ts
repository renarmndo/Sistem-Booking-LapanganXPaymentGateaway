import type { ReactNode } from 'react'

export type PitchPatternVariant = 'stripes' | 'lines' | 'dots' | 'hatch' | 'blocked'

export interface PitchPatternProps {
  variant?: PitchPatternVariant
  className?: string
  children?: ReactNode
}
