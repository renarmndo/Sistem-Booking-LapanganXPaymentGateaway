import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders decorative skeleton placeholder', () => {
    const { container } = render(<Skeleton variant="text" className="w-1/2" />)
    const el = container.firstElementChild
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el?.className).toContain('w-1/2')
  })
})
