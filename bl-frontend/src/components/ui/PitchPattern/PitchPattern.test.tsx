import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PitchPattern } from './PitchPattern'

describe('PitchPattern', () => {
  it('renders stripes and lines variants', () => {
    const { rerender, container } = render(
      <PitchPattern variant="hatch">
        <span>Slot</span>
      </PitchPattern>,
    )
    expect(screen.getByText('Slot')).toBeInTheDocument()
    expect(container.firstElementChild?.className).toContain('pattern-hatch')

    rerender(<PitchPattern variant="lines">Lines</PitchPattern>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
