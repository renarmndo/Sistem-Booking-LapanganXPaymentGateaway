import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { AccountPage } from './pages/AccountPage'
import { useAuthStore } from './store/auth.store'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  useAuthStore.getState().clear()
})
afterAll(() => server.close())

function renderAccount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <AccountPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('AccountPage', () => {
  it('loads profile from /auth/me and updates profile & password via /users/me endpoints', async () => {
    useAuthStore.getState().setSession(
      {
        id: 1,
        name: 'Budi',
        email: 'budi@example.com',
        phone: '08123456789',
        role: 'user',
        verification_status: 'VERIFIED',
      },
      'test-access-token',
    )

    let updatedName = ''
    let passwordChanged = false

    server.use(
      mswHttp.get('/api/v1/auth/me', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            id: 1,
            name: 'Budi',
            email: 'budi@example.com',
            phone: '08123456789',
            role: 'user',
            verification_status: 'VERIFIED',
          },
        }),
      ),
      mswHttp.put('/api/v1/users/me', async ({ request }) => {
        const body = (await request.json()) as { name: string; phone: string }
        updatedName = body.name
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            id: 1,
            name: body.name,
            email: 'budi@example.com',
            phone: body.phone,
            role: 'user',
            verification_status: 'VERIFIED',
          },
        })
      }),
      mswHttp.put('/api/v1/users/me/password', async () => {
        passwordChanged = true
        return HttpResponse.json({ success: true, message: 'OK', data: null })
      }),
    )

    renderAccount()

    const nameInput = await screen.findByLabelText(/Nama Lengkap/i)
    fireEvent.change(nameInput, { target: { value: 'Budi Santoso' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Profil' }))

    expect(await screen.findByText('Profil berhasil diperbarui.')).toBeInTheDocument()
    expect(updatedName).toBe('Budi Santoso')

    fireEvent.change(screen.getByLabelText(/Password Saat Ini/i), {
      target: { value: 'oldpassword1' },
    })
    fireEvent.change(screen.getByLabelText(/^Password Baru/i), {
      target: { value: 'newpassword1' },
    })
    fireEvent.change(screen.getByLabelText(/Konfirmasi Password Baru/i), {
      target: { value: 'newpassword1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Perbarui Password' }))

    expect(await screen.findByText('Password berhasil diubah.')).toBeInTheDocument()
    expect(passwordChanged).toBe(true)
  })
})
