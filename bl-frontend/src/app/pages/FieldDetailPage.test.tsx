import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { FieldDetailPage } from './FieldDetailPage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('FieldDetailPage', () => {
  it('loads field detail, disables past slots, and reloads availability on date change', async () => {
    const requestedDates: string[] = []

    server.use(
      mswHttp.get('/api/v1/fields/1', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            id: 1,
            owner_id: 10,
            name: 'Arena Utama A',
            slug: 'arena-utama-a',
            surface_type: 'Sintetis',
            capacity: 14,
            address: 'Jl. Stadion 1',
            city: 'Jakarta',
            is_active: true,
            cover_url: '',
            min_price: 175000,
            description: 'Lapangan standar FIFA.',
            latitude: null,
            longitude: null,
            photos: [],
            facilities: [{ id: 1, name: 'Lampu', icon: 'lightbulb' }],
            prices: [],
            operating_hours: [],
          },
        }),
      ),
      mswHttp.get('/api/v1/fields/1/availability', ({ request }) => {
        const date = new URL(request.url).searchParams.get('date') ?? ''
        requestedDates.push(date)

        if (requestedDates.length === 1) {
          return HttpResponse.json({
            success: true,
            message: 'OK',
            data: [
              { start_time: '08:00', end_time: '09:00', price: 150000, status: 'past' },
              { start_time: '19:00', end_time: '20:00', price: 250000, status: 'available' },
            ],
          })
        }

        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: [{ start_time: '09:00', end_time: '10:00', price: 150000, status: 'available' }],
        })
      }),
    )

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/lapangan/1']}>
            <Routes>
              <Route path="/lapangan/:id" element={<FieldDetailPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('heading', { level: 1, name: 'Arena Utama A' })).toBeInTheDocument()

    const pastSlot = await screen.findByRole('button', { name: /08:00/i })
    expect(pastSlot).toBeDisabled()

    const availableSlot = screen.getByRole('button', { name: /19:00/i })
    expect(availableSlot).toBeEnabled()
    fireEvent.click(availableSlot)
    expect(screen.getByText(/1 jam \(19:00 – 20:00\)/i)).toBeInTheDocument()

    // Click second date option in DateStrip
    const dateOptions = screen.getAllByRole('option')
    fireEvent.click(dateOptions[1])

    expect(await screen.findByRole('button', { name: /09:00/i })).toBeEnabled()
    expect(requestedDates.length).toBe(2)
  })
})
