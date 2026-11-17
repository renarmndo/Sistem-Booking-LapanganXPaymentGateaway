import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { AdminFieldFormModal } from './components/AdminFieldFormModal'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderModal(fieldId: number | null = null, onClose = () => {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <AdminFieldFormModal open fieldId={fieldId} onClose={onClose} />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('AdminFieldFormModal (Noel Futsal single-venue)', () => {
  it('renders 5 tabs without owner selector, validates with zod, and submits field payload', async () => {
    let createdPayload: Record<string, unknown> = {}
    let closed = false

    server.use(
      mswHttp.get('/api/v1/admin/facilities', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: [{ id: 1, name: 'Parkir Luas', icon: 'car' }],
        }),
      ),
      mswHttp.post('/api/v1/admin/fields', async ({ request }) => {
        createdPayload = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          success: true,
          message: 'Created',
          data: {
            id: 10,
            owner_id: 3,
            name: 'Lapangan A - Vinyl',
            slug: 'lapangan-a-vinyl',
            surface_type: 'Rumput Sintetis',
            capacity: 10,
            address: 'Noel Futsal Arena',
            city: 'Jakarta',
            is_active: true,
            cover_url: '',
            min_price: 150000,
            facilities: [{ id: 1, name: 'Parkir Luas', icon: 'car' }],
            description: '',
            latitude: null,
            longitude: null,
            photos: [],
            prices: [],
            operating_hours: [],
          },
        })
      }),
    )

    renderModal(null, () => {
      closed = true
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Info Lapangan/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Fasilitas/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Harga Slot/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Jam Operasional/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Foto/i })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Pemilik/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Lapangan' }))
    expect(await screen.findByText(/Nama lapangan minimal 2 karakter/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Nama Lapangan/i), {
      target: { value: 'Lapangan A - Vinyl' },
    })

    fireEvent.click(screen.getByRole('tab', { name: /Fasilitas/i }))
    fireEvent.click(await screen.findByRole('button', { name: 'Parkir Luas' }))

    fireEvent.click(screen.getByRole('button', { name: 'Simpan Lapangan' }))

    await waitFor(() => {
      expect(closed).toBe(true)
    })
    expect(createdPayload.name).toBe('Lapangan A - Vinyl')
    expect(createdPayload.address).toBe('Noel Futsal Arena')
    expect(createdPayload.city).toBe('Jakarta')
    expect(createdPayload.owner_id).toBeUndefined()
    expect(createdPayload.facility_ids).toEqual([1])
  })
})
