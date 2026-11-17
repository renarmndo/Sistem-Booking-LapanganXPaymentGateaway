import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PayCountdown } from './components/PayCountdown'

describe('PayCountdown', () => {
  it('shows warning urgency under 5 minutes, critical under 1 minute, and expired state', async () => {
    const fourMins = new Date(Date.now() + 4 * 60 * 1000).toISOString()
    const { container, rerender } = render(<PayCountdown expiresAt={fourMins} />)

    expect(container.firstChild).toHaveAttribute('data-urgency', 'warning')
    expect(screen.getByText(/Sisa waktu pembayaran/i)).toBeInTheDocument()

    const thirtySecs = new Date(Date.now() + 30 * 1000).toISOString()
    rerender(<PayCountdown expiresAt={thirtySecs} />)
    await waitFor(() =>
      expect(container.firstChild).toHaveAttribute('data-urgency', 'critical'),
    )

    const past = new Date(Date.now() - 5000).toISOString()
    rerender(<PayCountdown expiresAt={past} />)
    await waitFor(() =>
      expect(screen.getByText(/Batas waktu pembayaran habis/i)).toBeInTheDocument(),
    )
  })
})
