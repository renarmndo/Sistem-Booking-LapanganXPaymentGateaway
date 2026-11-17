import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Spinner } from './Spinner'

describe('Spinner', () => {
  it('renders with accessible status role and label', () => {
    render(<Spinner label="Sedang memproses" />)
    expect(screen.getByRole('status', { name: 'Sedang memproses' })).toBeInTheDocument()
  })
})
