import { cn } from '@/utils/cn'
import type { PitchPatternProps, PitchPatternVariant } from './PitchPattern.types'

const patternClasses: Record<Exclude<PitchPatternVariant, 'lines'>, string> = {
  stripes: 'pattern-stripes',
  dots: 'pattern-dots',
  hatch: 'pattern-hatch',
  blocked: 'pattern-blocked',
}

export function PitchPattern({
  variant = 'stripes',
  className,
  children,
}: PitchPatternProps) {
  if (variant === 'lines') {
    return (
      <div className={cn('pattern-stripes relative overflow-hidden', className)}>
        <svg
          viewBox="0 0 800 500"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1.5"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover text-surface"
        >
          <rect x="20" y="20" width="760" height="460" rx="4" />
          <line x1="400" y1="20" x2="400" y2="480" />
          <circle cx="400" cy="250" r="70" />
          <rect x="20" y="150" width="120" height="200" />
          <rect x="660" y="150" width="120" height="200" />
        </svg>
        <div className="relative z-10">{children}</div>
      </div>
    )
  }

  return <div className={cn(patternClasses[variant], className)}>{children}</div>
}
