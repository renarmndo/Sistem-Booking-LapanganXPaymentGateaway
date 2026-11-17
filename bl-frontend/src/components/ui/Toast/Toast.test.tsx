import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('ToastProvider (Sonner)', () => {
  it('shows sonner toast notifications', async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan Toast' }))

    await waitFor(() => {
      expect(screen.getByText('Sukses')).toBeInTheDocument()
      expect(screen.getByText('Berhasil disimpan')).toBeInTheDocument()
    })
  })
})
