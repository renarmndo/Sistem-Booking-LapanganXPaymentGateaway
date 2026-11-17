import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders badge text and variant styles', () => {
    render(<Badge variant="gold">Populer</Badge>)
    const badge = screen.getByText('Populer')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-gold-100')
  })
})
