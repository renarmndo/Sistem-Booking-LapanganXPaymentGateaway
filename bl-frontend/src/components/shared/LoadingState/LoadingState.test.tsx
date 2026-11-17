import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingState } from './LoadingState'

describe('LoadingState', () => {
  it('renders skeleton cards and spinner variants', () => {
    const { rerender } = render(<LoadingState variant="cards" count={2} label="Memuat kartu" />)
    expect(screen.getByLabelText('Memuat kartu')).toHaveAttribute('aria-busy', 'true')

    rerender(<LoadingState variant="spinner" label="Memuat halaman" />)
    expect(screen.getByText('Memuat halaman')).toBeInTheDocument()
  })
})
