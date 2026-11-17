import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('renders alert and invokes retry handler', () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Koneksi gagal" onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Koneksi gagal')
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
