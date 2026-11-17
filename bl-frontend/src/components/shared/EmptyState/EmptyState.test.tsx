import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title, description, and action', () => {
    render(
      <EmptyState
        title="Belum ada data"
        description="Data akan muncul di sini."
        action={<button type="button">Muat Ulang</button>}
      />,
    )
    expect(screen.getByText('Belum ada data')).toBeInTheDocument()
    expect(screen.getByText('Data akan muncul di sini.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Muat Ulang' })).toBeInTheDocument()
  })
})
