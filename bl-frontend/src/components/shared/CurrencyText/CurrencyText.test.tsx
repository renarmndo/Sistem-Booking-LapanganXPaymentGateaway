import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CurrencyText } from './CurrencyText'

describe('CurrencyText', () => {
  it('formats Rupiah amount with optional suffix', () => {
    render(<CurrencyText value={175000} suffix="/jam" />)
    expect(screen.getByText(/Rp 175\.000/)).toBeInTheDocument()
    expect(screen.getByText('/jam')).toBeInTheDocument()
  })
})
