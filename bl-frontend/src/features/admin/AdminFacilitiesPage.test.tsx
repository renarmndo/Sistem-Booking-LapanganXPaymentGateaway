import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { AdminFacilitiesPage } from './pages/AdminFacilitiesPage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderFacilities() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <AdminFacilitiesPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('AdminFacilitiesPage', () => {
  it('lists facilities and creates a new facility via POST /admin/facilities', async () => {
    let createdName = ''

    server.use(
      mswHttp.get('/api/v1/admin/facilities', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: [{ id: 1, name: 'Parkir Luas', icon: 'car' }],
        }),
      ),
      mswHttp.post('/api/v1/admin/facilities', async ({ request }) => {
        const body = (await request.json()) as { name: string; icon: string }
        createdName = body.name
        return HttpResponse.json(
          {
            success: true,
            message: 'Created',
            data: { id: 2, name: body.name, icon: body.icon },
          },
          { status: 201 },
        )
      }),
    )

    renderFacilities()

    const items = await screen.findAllByText('Parkir Luas')
    expect(items.length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: /Tambah Fasilitas/i }))
    fireEvent.change(screen.getByLabelText(/Nama Fasilitas/i), {
      target: { value: 'Ruang Ganti' },
    })
    fireEvent.change(screen.getByLabelText(/Nama Ikon/i), {
      target: { value: 'shirt' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Fasilitas berhasil ditambahkan.')).toBeInTheDocument()
    expect(createdName).toBe('Ruang Ganti')
  })
})
