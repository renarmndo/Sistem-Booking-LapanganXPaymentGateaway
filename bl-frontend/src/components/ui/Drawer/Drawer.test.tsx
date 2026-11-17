import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Drawer } from './Drawer'

describe('Drawer', () => {
  it('renders dialog and closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="Filter Arena">
        <p>Konten filter</p>
      </Drawer>,
    )
    expect(screen.getByRole('dialog', { name: 'Filter Arena' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
