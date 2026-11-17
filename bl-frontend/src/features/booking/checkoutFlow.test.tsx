import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { CheckoutPage } from './pages/CheckoutPage'
import { PaymentStatusPage } from './pages/PaymentStatusPage'
import { useCheckoutDraftStore } from './store/checkoutDraft.store'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  useCheckoutDraftStore.getState().clearDraft()
})
afterAll(() => server.close())

function seedDraft() {
  useCheckoutDraftStore.getState().setDraft({
    fieldId: 1,
    fieldName: 'Arena Utama A',
    surfaceType: 'Sintetis',
    capacity: 14,
    date: '2026-11-20',
    slots: [{ start_time: '19:00', end_time: '20:00', price: 250000, status: 'available' }],
    totalAmount: 250000,
  })
}

function renderCheckout() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/booking/checkout']}>
          <Routes>
            <Route path="/booking/checkout" element={<CheckoutPage />} />
            <Route path="/booking/:id/status" element={<PaymentStatusPage />} />
            <Route path="/lapangan/:id" element={<div>Halaman Detail Lapangan</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('Checkout flow', () => {
  it('submits booking and navigates to /booking/:id/status', async () => {
    seedDraft()

    server.use(
      mswHttp.post('/api/v1/bookings', () =>
        HttpResponse.json(
          {
            success: true,
            message: 'Created',
            data: {
              booking_id: 55,
              code: 'BK-20261120-ABC123',
              total: 250000,
              expires_at: '2026-11-20T12:15:00+07:00',
              payment: {
                provider: 'midtrans_stub',
                token: 'stub-snap-BK-20261120-ABC123',
                redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/stub',
              },
            },
          },
          { status: 201 },
        ),
      ),
      mswHttp.get('/api/v1/bookings/55', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            id: 55,
            code: 'BK-20261120-ABC123',
            field: {
              id: 1,
              name: 'Arena Utama A',
              slug: 'arena-utama-a',
              surface_type: 'Sintetis',
              cover_url: '',
            },
            booking_date: '2026-11-20',
            start_time: '19:00',
            end_time: '20:00',
            total_amount: 250000,
            status: 'PENDING_PAYMENT',
            source: 'online',
            expires_at: '2026-11-20T12:15:00+07:00',
            cancelled_at: null,
            cancel_reason: '',
            slots: [{ start_time: '19:00', end_time: '20:00', price: 250000 }],
            payment: { provider: 'midtrans_stub', status: 'pending' },
            created_at: '2026-11-20T12:00:00+07:00',
          },
        }),
      ),
    )

    renderCheckout()

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    fireEvent.click(screen.getByRole('button', { name: /Buat Booking & Lanjut Pembayaran/i }))

    expect(await screen.findByText(/Status Booking BK-20261120-ABC123/i)).toBeInTheDocument()
  })

  it('redirects back to field detail gracefully on 409 SLOT_TAKEN', async () => {
    seedDraft()

    server.use(
      mswHttp.post('/api/v1/bookings', () =>
        HttpResponse.json(
          { success: false, message: 'Slot sudah diambil', code: 'SLOT_TAKEN' },
          { status: 409 },
        ),
      ),
    )

    renderCheckout()

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /Buat Booking & Lanjut Pembayaran/i }))

    expect(await screen.findByText('Halaman Detail Lapangan')).toBeInTheDocument()
  })
})
