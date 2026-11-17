import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { PATHS } from '@/app/router/paths'
import { ToastProvider } from '@/components/ui'
import { useAuthStore, useRestoreSession, type AuthUser } from '@/features/auth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  useAuthStore.getState().clear()
})
afterAll(() => server.close())

function renderWithProviders(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path={PATHS.HOME} element={<div>Halaman Beranda</div>} />
            <Route path={PATHS.LOGIN} element={<LoginPage />} />
            <Route path={PATHS.REGISTER} element={<RegisterPage />} />
            <Route path={PATHS.ADMIN_DASHBOARD} element={<div>Halaman Admin</div>} />
            <Route path={PATHS.OWNER_DASHBOARD} element={<div>Halaman Pemilik</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('Auth flow (Register, OTP, Login, Session Restore)', () => {
  it('shows server error on duplicate email and completes register -> verify OTP flow', async () => {
    let attempt = 0
    server.use(
      mswHttp.post('/api/v1/auth/register', () => {
        attempt += 1
        if (attempt === 1) {
          return HttpResponse.json(
            { success: false, message: 'Email sudah terdaftar', code: 'EMAIL_EXISTS' },
            { status: 409 },
          )
        }
        return HttpResponse.json(
          {
            success: true,
            message: 'Registrasi berhasil',
            data: {
              id: 1,
              name: 'Budi Santoso',
              email: 'budi@example.com',
              phone: '081234567890',
              role: 'user',
              verification_status: 'UNVERIFIED',
            } satisfies AuthUser,
          },
          { status: 201 },
        )
      }),
      mswHttp.post('/api/v1/auth/verify-otp', () =>
        HttpResponse.json({ success: true, message: 'Verifikasi berhasil', data: null }),
      ),
    )

    renderWithProviders(PATHS.REGISTER)

    fireEvent.change(screen.getByLabelText(/Nama Lengkap/i), {
      target: { value: 'Budi Santoso' },
    })
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'budi@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/Nomor HP/i), {
      target: { value: '081234567890' },
    })
    fireEvent.change(screen.getByLabelText(/^Kata Sandi/i), {
      target: { value: 'Password123!' },
    })

    expect(screen.getByText(/Kekuatan kata sandi:/i)).toBeInTheDocument()

    // First submit -> 409 duplicate email
    fireEvent.click(screen.getByRole('button', { name: 'Daftar Akun' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email sudah terdaftar')

    // Second submit -> 201 -> OTP step
    fireEvent.click(screen.getByRole('button', { name: 'Daftar Akun' }))
    const otpInput = await screen.findByLabelText(/Kode OTP/i)
    fireEvent.change(otpInput, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'Verifikasi Akun' }))

    expect(await screen.findByRole('heading', { name: 'Masuk ke Akun' })).toBeInTheDocument()
  })

  it('logs in admin and redirects to /admin', async () => {
    server.use(
      mswHttp.post('/api/v1/auth/login', () =>
        HttpResponse.json({
          success: true,
          message: 'Login berhasil',
          data: {
            access_token: 'admin-jwt',
            expires_in: 900,
            user: {
              id: 1,
              name: 'Admin Utama',
              email: 'admin@example.com',
              phone: '081234567890',
              role: 'admin',
              verification_status: 'VERIFIED',
            },
          },
        }),
      ),
    )

    renderWithProviders(PATHS.LOGIN)
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'admin@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Kata Sandi/i), {
      target: { value: 'AdminPass123!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }))

    expect(await screen.findByText('Halaman Admin')).toBeInTheDocument()
    expect(useAuthStore.getState().role).toBe('admin')
  })

  it('restores session via /auth/refresh on mount', async () => {
    server.use(
      mswHttp.post('/api/v1/auth/refresh', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            access_token: 'restored-jwt',
            expires_in: 900,
            user: {
              id: 2,
              name: 'Owner Arena',
              email: 'owner@example.com',
              phone: '081234567890',
              role: 'owner',
              verification_status: 'VERIFIED',
            },
          },
        }),
      ),
    )

    function RestoreProbe() {
      const { isRestoring } = useRestoreSession()
      return <span>{isRestoring ? 'loading' : 'ready'}</span>
    }

    render(<RestoreProbe />)
    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument())
    expect(useAuthStore.getState().accessToken).toBe('restored-jwt')
    expect(useAuthStore.getState().role).toBe('owner')
  })
})
