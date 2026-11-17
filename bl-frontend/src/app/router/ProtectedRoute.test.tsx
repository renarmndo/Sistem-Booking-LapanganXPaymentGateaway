import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { appRoutes } from '@/app/router'
import { PATHS } from '@/app/router/paths'
import { ToastProvider } from '@/components/ui'
import { useAuthStore } from '@/features/auth'

function renderAt(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  useAuthStore.getState().clear()
})

describe('Role-based routing & ProtectedRoute', () => {
  it('redirects unauthenticated users from /admin to /masuk', async () => {
    renderAt(PATHS.ADMIN_DASHBOARD)
    expect(await screen.findByRole('heading', { name: 'Masuk ke Akun' })).toBeInTheDocument()
  })

  it('shows 403 Forbidden when user role accesses /admin or /pemilik', async () => {
    useAuthStore.getState().setSession(
      {
        id: 10,
        name: 'Budi',
        email: 'budi@example.com',
        phone: '081234567890',
        role: 'user',
        verification_status: 'VERIFIED',
      },
      'valid-token',
    )

    const { unmount } = renderAt(PATHS.ADMIN_DASHBOARD)
    expect(await screen.findByRole('heading', { name: 'Akses Ditolak' })).toBeInTheDocument()
    unmount()

    renderAt(PATHS.OWNER_DASHBOARD)
    expect(await screen.findByRole('heading', { name: 'Akses Ditolak' })).toBeInTheDocument()
  })

  it('renders Admin Dashboard when authenticated as admin', async () => {
    useAuthStore.getState().setSession(
      {
        id: 1,
        name: 'Admin Utama',
        email: 'admin@example.com',
        phone: '081234567890',
        role: 'admin',
        verification_status: 'VERIFIED',
      },
      'admin-token',
    )

    renderAt(PATHS.ADMIN_DASHBOARD)
    expect(await screen.findByRole('heading', { name: 'Dashboard Admin' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Panel Admin' })).toBeInTheDocument()
  })

  it('renders 404 NotFoundPage for unknown routes', async () => {
    renderAt('/halaman-yang-tidak-ada')
    expect(await screen.findByRole('heading', { name: 'Halaman Tidak Ditemukan' })).toBeInTheDocument()
  })
})
