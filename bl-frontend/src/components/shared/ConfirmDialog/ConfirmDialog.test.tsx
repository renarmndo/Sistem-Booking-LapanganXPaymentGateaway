import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('invokes onConfirm and onClose', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(
      <ConfirmDialog
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="Batalkan Booking?"
        description="Slot akan dilepas kembali."
        confirmLabel="Ya, Batalkan"
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Batalkan Booking?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ya, Batalkan' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
