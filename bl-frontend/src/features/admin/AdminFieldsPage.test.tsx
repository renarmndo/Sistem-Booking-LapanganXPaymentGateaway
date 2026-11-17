import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { AdminFieldsPage } from './pages/AdminFieldsPage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderAdminFields() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <AdminFieldsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('AdminFieldsPage', () => {
  it('loads admin fields & facilities and toggles field status with upcoming booking notice', async () => {
    let statusUpdated = false

    server.use(
      mswHttp.get('/api/v1/admin/fields', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            items: [
              {
                id: 1,
                owner_id: 1,
                name: 'Arena Utama A',
                slug: 'arena-utama-a',
                surface_type: 'Sintetis',
                capacity: 14,
                address: 'Jl. Stadion 1',
                city: 'Jakarta',
                is_active: true,
                cover_url: '',
                min_price: 250000,
                facilities: [],
              },
            ],
            meta: { page: 1, limit: 10, total: 1, total_pages: 1 },
          },
        }),
      ),
      mswHttp.put('/api/v1/admin/fields/1/status', async ({ request }) => {
        const body = (await request.json()) as { is_active: boolean }
        statusUpdated = !body.is_active
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: { id: 1, is_active: body.is_active, upcoming_bookings_count: 2 },
        })
      }),
    )

    renderAdminFields()

    const items = await screen.findAllByText('Arena Utama A')
    expect(items.length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button', { name: 'Nonaktifkan' })[0])
    expect(await screen.findByText('Nonaktifkan Lapangan?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Konfirmasi' }))
    expect(await screen.findByText(/Terdapat 2 booking mendatang/i)).toBeInTheDocument()
    expect(statusUpdated).toBe(true)
  })
})
