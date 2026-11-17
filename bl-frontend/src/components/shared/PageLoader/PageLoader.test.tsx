import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageLoader } from './PageLoader'

describe('PageLoader', () => {
  it('renders full-page loading status', () => {
    render(<PageLoader label="Menyiapkan data..." />)
    expect(screen.getByRole('status', { name: 'Menyiapkan data...' })).toBeInTheDocument()
    expect(screen.getByText('Menyiapkan data...')).toBeInTheDocument()
  })
})
