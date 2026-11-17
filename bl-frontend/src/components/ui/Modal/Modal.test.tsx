import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders dialog when open and closes on Escape or close button', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Konfirmasi">
        <p>Isi modal</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog', { name: 'Konfirmasi' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Tutup dialog' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
