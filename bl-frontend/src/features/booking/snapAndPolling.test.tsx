import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { PayButton } from './components/PayButton'
import { PaymentStatusPage } from './pages/PaymentStatusPage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  vi.useRealTimers()
  delete window.snap
})
afterAll(() => server.close())

function renderWithProviders(ui: React.ReactElement, initialEntry = '/booking/55/status') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/booking/:id/status" element={ui} />
            <Route path="/lapangan" element={<div>Daftar Lapangan</div>} />
            <Route path="/bookings" element={<div>Booking Saya</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

function makeBooking(status: 'PENDING_PAYMENT' | 'CONFIRMED', channel?: string) {
  return {
    id: 55,
    code: 'BK-20261120-SNAP01',
    status,
    date: '2026-11-20',
    total_amount: 250000,
    expires_at: '2026-11-20T12:15:00+07:00',
    field: { id: 1, name: 'Arena Utama A', surface_type: 'Sintetis' },
    slots: [{ start_time: '19:00', end_time: '20:00', price: 250000 }],
    payment: {
      provider: 'midtrans',
      method: 'midtrans',
      channel,
      status: status === 'CONFIRMED' ? 'paid' : 'pending',
    },
  }
}

describe('useSnapPay & PayButton', () => {
  it('opens window.snap.pay and triggers polling on callback', async () => {
    const payMock = vi.fn((_token: string, callbacks) => {
      callbacks?.onSuccess?.({ transaction_status: 'settlement' })
    })
    window.snap = { pay: payMock }
    const onTriggerPolling = vi.fn()

    renderWithProviders(
      <PayButton bookingId={55} initialToken="snap-token-123" onTriggerPolling={onTriggerPolling} />,
    )

    fireEvent.click(screen.getByRole('button', { name: /bayar sekarang/i }))

    await waitFor(() => {
      expect(payMock).toHaveBeenCalledWith('snap-token-123', expect.any(Object))
    })
    expect(onTriggerPolling).toHaveBeenCalledTimes(1)
  })

  it('shows expired toast when POST /bookings/:id/pay returns 422', async () => {
    server.use(
      mswHttp.post('/api/v1/bookings/55/pay', () =>
        HttpResponse.json(
          { success: false, message: 'Booking expired', code: 'BOOKING_EXPIRED' },
          { status: 422 },
        ),
      ),
    )

    renderWithProviders(<PayButton bookingId={55} label="Lanjutkan Bayar" />)

    fireEvent.click(screen.getByRole('button', { name: /lanjutkan bayar/i }))

    expect(
      await screen.findByText(/batas waktu pembayaran sudah berakhir/i),
    ).toBeInTheDocument()
  })
})

describe('usePaymentPolling & PaymentStatusPage', () => {
  it('polls every 3s, invokes sync-payment fallback after 3 polls, and updates to CONFIRMED', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })

    let getCount = 0
    let synced = false

    server.use(
      mswHttp.get('/api/v1/bookings/55', () => {
        getCount += 1
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: synced ? makeBooking('CONFIRMED', 'qris') : makeBooking('PENDING_PAYMENT'),
        })
      }),
      mswHttp.post('/api/v1/bookings/55/pay', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            snap_token: 'snap-token-live',
            redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-live',
          },
        }),
      ),
      mswHttp.post('/api/v1/bookings/55/sync-payment', () => {
        synced = true
        return HttpResponse.json({
          success: true,
          message: 'Synced',
          data: { booking_status: 'CONFIRMED', payment_status: 'paid' },
        })
      }),
    )

    window.snap = {
      pay: vi.fn((_token: string, callbacks) => {
        callbacks?.onClose?.()
      }),
    }

    renderWithProviders(<PaymentStatusPage />)

    await waitFor(() => {
      expect(screen.getByText(/menunggu pembayaran/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /bayar sekarang/i }))

    await waitFor(() => {
      expect(screen.getByText(/memverifikasi pembayaran/i)).toBeInTheDocument()
    })

    // Advance 3 polling intervals (3 * 3000ms) to trigger sync-payment fallback
    for (let i = 0; i < 3; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3100)
      })
    }

    await waitFor(() => {
      expect(synced).toBe(true)
      expect(screen.getByText(/pembayaran berhasil/i)).toBeInTheDocument()
    })
    expect(getCount).toBeGreaterThanOrEqual(4)
  })
})
