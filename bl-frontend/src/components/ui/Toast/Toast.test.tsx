import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ToastProvider, useToast } from './index'

function ToastTrigger() {
  const toast = useToast()
  return (
    <button type="button" onClick={() => toast.success('Berhasil disimpan', 'Sukses')}>
      Tampilkan Toast
    </button>
  )
}

describe('ToastProvider', () => {
  it('shows and dismisses toast notifications', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan Toast' }))
    expect(screen.getByRole('status')).toHaveTextContent('Berhasil disimpan')

    fireEvent.click(screen.getByRole('button', { name: 'Tutup notifikasi' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
