import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { BookingDetailPage } from './pages/BookingDetailPage'
import { MyBookingsPage } from './pages/MyBookingsPage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderWithRouter(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/booking-saya" element={<MyBookingsPage />} />
            <Route path="/booking-saya/:id" element={<BookingDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('MyBookingsPage & BookingDetailPage', () => {
  it('lists bookings, opens detail, and cancels booking updating UI without reload', async () => {
    let cancelled = false

    server.use(
      mswHttp.get('/api/v1/bookings/me', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            items: [
              {
                id: 77,
                code: 'BK-20261120-XYZ999',
                field: {
                  id: 1,
                  name: 'Arena Utama A',
                  slug: 'arena-utama-a',
                  surface_type: 'Sintetis',
                  cover_url: '',
                },
                booking_date: '2026-11-25',
                start_time: '19:00',
                end_time: '20:00',
                total_amount: 250000,
                status: cancelled ? 'CANCELLED' : 'PENDING_PAYMENT',
                source: 'online',
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
                cancelled_at: null,
                cancel_reason: '',
                slots: [{ start_time: '19:00', end_time: '20:00', price: 250000 }],
                payment: { provider: 'midtrans_stub', status: 'pending' },
                created_at: '2026-11-17T10:00:00+07:00',
              },
            ],
            meta: { page: 1, limit: 10, total: 1, total_pages: 1 },
          },
        }),
      ),
      mswHttp.get('/api/v1/bookings/77', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            id: 77,
            code: 'BK-20261120-XYZ999',
            field: {
              id: 1,
              name: 'Arena Utama A',
              slug: 'arena-utama-a',
              surface_type: 'Sintetis',
              cover_url: '',
            },
            booking_date: '2026-11-25',
            start_time: '19:00',
            end_time: '20:00',
            total_amount: 250000,
            status: cancelled ? 'CANCELLED' : 'PENDING_PAYMENT',
            source: 'online',
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            cancelled_at: cancelled ? '2026-11-17T10:05:00+07:00' : null,
            cancel_reason: cancelled ? 'Berubah jadwal' : '',
            slots: [{ start_time: '19:00', end_time: '20:00', price: 250000 }],
            payment: { provider: 'midtrans_stub', status: cancelled ? 'cancelled' : 'pending' },
            created_at: '2026-11-17T10:00:00+07:00',
          },
        }),
      ),
      mswHttp.post('/api/v1/bookings/77/cancel', () => {
        cancelled = true
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            id: 77,
            code: 'BK-20261120-XYZ999',
            status: 'CANCELLED',
            refund_percent: 0,
            refund_amount: 0,
          },
        })
      }),
    )

    renderWithRouter('/booking-saya')

    expect(await screen.findByText('BK-20261120-XYZ999')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: /Detail/i }))

    expect(await screen.findByRole('button', { name: /Batalkan Booking/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Batalkan Booking/i }))

    expect(await screen.findByText(/Slot akan dilepas kembali/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi Pembatalan/i }))

    expect(await screen.findByText('Dibatalkan')).toBeInTheDocument()
  })
})
