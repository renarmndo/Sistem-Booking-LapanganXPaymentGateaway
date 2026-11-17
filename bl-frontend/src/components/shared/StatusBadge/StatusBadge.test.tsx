import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders mapped Indonesian label for known statuses', () => {
    const { rerender } = render(<StatusBadge status="pending" />)
    expect(screen.getByText('Menunggu Pembayaran')).toBeInTheDocument()

    rerender(<StatusBadge status="paid" label="Sudah Dibayar" />)
    expect(screen.getByText('Sudah Dibayar')).toBeInTheDocument()
  })
})
