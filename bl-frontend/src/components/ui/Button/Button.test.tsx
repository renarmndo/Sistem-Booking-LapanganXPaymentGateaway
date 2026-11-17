import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders children and applies loading & fullWidth states', () => {
    render(
      <Button variant="accent" size="lg" loading fullWidth>
        Simpan
      </Button>,
    )
    const btn = screen.getByRole('button', { name: /Simpan/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-busy', 'true')
    expect(btn.className).toContain('w-full')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
