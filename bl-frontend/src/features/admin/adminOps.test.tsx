import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { OfflineBookingForm } from './bookings/components/OfflineBookingForm'
import { AdminBookingsPage } from './bookings/pages/AdminBookingsPage'
import { BlockScheduleDialog } from './schedules/components/BlockScheduleDialog'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 5 Admin Operations FE', () => {
  it('completes 4-step OfflineBookingForm and handles 409 by returning to step 1', async () => {
    let attempt = 0
    server.use(
      mswHttp.get('/api/v1/admin/fields', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            items: [
              {
                id: 1,
                owner_id: 3,
                name: 'Lapangan A',
                slug: 'lapangan-a',
                surface_type: 'Vinyl',
                capacity: 10,
                address: 'Noel Futsal Arena',
                city: 'Jakarta',
                is_active: true,
                cover_url: '',
                min_price: 150000,
                facilities: [],
              },
            ],
            meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
          },
        }),
      ),
      mswHttp.get('/api/v1/fields/1/availability', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: [{ start_time: '19:00', end_time: '20:00', price: 150000, status: 'available' }],
        }),
      ),
      mswHttp.post('/api/v1/admin/bookings/offline', () => {
        attempt += 1
        if (attempt === 1) {
          return HttpResponse.json(
            { success: false, message: 'Slot taken', code: 'SLOT_TAKEN' },
            { status: 409 },
          )
        }
        return HttpResponse.json({
          success: true,
          message: 'Created',
          data: {
            id: 77,
            code: 'BK-OFFLINE-77',
            field: { id: 1, name: 'Lapangan A', slug: 'lapangan-a', surface_type: 'Vinyl', cover_url: '' },
            booking_date: '2026-11-20',
            start_time: '19:00',
            end_time: '20:00',
            total_amount: 150000,
            status: 'CONFIRMED',
            source: 'offline',
            expires_at: null,
            cancelled_at: null,
            cancel_reason: '',
            slots: [{ start_time: '19:00', end_time: '20:00', price: 150000 }],
            payment: { provider: 'cash', status: 'paid' },
            customer_name: 'Budi',
            customer_phone: '08123456789',
            paid_amount: 150000,
            created_at: '2026-11-17T10:00:00Z',
          },
        })
      }),
    )

    wrap(<OfflineBookingForm initialFieldId={1} initialDate="2026-11-20" />)

    // Step 1: pick slot
    const slotBtn = await screen.findByRole('button', { name: /19:00/i })
    fireEvent.click(slotBtn)
    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Pelanggan/i }))

    // Step 2: guest info
    fireEvent.change(screen.getByLabelText(/Nama Pemesan/i), { target: { value: 'Budi' } })
    fireEvent.change(screen.getByLabelText(/Nomor HP/i), { target: { value: '08123456789' } })
    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Pembayaran/i }))

    // Step 3: payment
    fireEvent.click(screen.getByRole('button', { name: /Tinjau Konfirmasi/i }))

    // Step 4: submit -> 409 returns to step 1
    fireEvent.click(screen.getByRole('button', { name: /Konfirmasi & Buat Booking/i }))
    await waitFor(() => {
      expect(screen.getByText(/Langkah 1: Pilih Lapangan/i)).toBeInTheDocument()
    })
  })

  it('filters AdminBookingsPage and opens CashPaymentDialog', async () => {
    server.use(
      mswHttp.get('/api/v1/admin/fields', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: { items: [], meta: { page: 1, limit: 50, total: 0, total_pages: 1 } },
        }),
      ),
      mswHttp.get('/api/v1/admin/bookings', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            items: [
              {
                id: 12,
                code: 'BK-ADMIN-12',
                field: { id: 1, name: 'Lapangan A', slug: 'lapangan-a', surface_type: 'Vinyl', cover_url: '' },
                booking_date: '2026-11-20',
                start_time: '18:00',
                end_time: '19:00',
                total_amount: 200000,
                status: 'CONFIRMED',
                source: 'offline',
                expires_at: null,
                cancelled_at: null,
                cancel_reason: '',
                slots: [{ start_time: '18:00', end_time: '19:00', price: 200000 }],
                payment: { provider: 'cash', status: 'partial' },
                customer_name: 'Siti',
                customer_phone: '08199999999',
                paid_amount: 50000,
                created_at: '2026-11-17T10:00:00Z',
              },
            ],
            meta: { page: 1, limit: 10, total: 1, total_pages: 1 },
          },
        }),
      ),
    )

    wrap(<AdminBookingsPage />)

    expect((await screen.findAllByText('BK-ADMIN-12')).length).toBeGreaterThan(0)
    fireEvent.click(screen.getAllByRole('button', { name: 'Bayar' })[0])
    expect(await screen.findByText(/Catat Pembayaran Tunai/i)).toBeInTheDocument()
  })

  it('shows conflicting bookings on 409 in BlockScheduleDialog', async () => {
    server.use(
      mswHttp.post('/api/v1/admin/schedule-blocks', () =>
        HttpResponse.json(
          {
            success: false,
            message: 'Jadwal bentrok dengan booking aktif',
            code: 'SCHEDULE_BLOCK_CONFLICT',
            data: {
              conflicting_bookings: [
                {
                  id: 5,
                  code: 'BK-CONFLICT-05',
                  status: 'CONFIRMED',
                  booking_date: '2026-11-20',
                  start_time: '19:00:00',
                  end_time: '20:00:00',
                },
              ],
            },
          },
          { status: 409 },
        ),
      ),
    )

    wrap(
      <BlockScheduleDialog
        open
        onClose={() => {}}
        fields={[
          {
            id: 1,
            owner_id: 3,
            name: 'Lapangan A',
            slug: 'lapangan-a',
            surface_type: 'Vinyl',
            capacity: 10,
            address: 'Noel Futsal Arena',
            city: 'Jakarta',
            is_active: true,
            cover_url: '',
            min_price: 150000,
            facilities: [],
          },
        ]}
        defaultFieldId={1}
        defaultDate="2026-11-20"
      />,
    )

    fireEvent.change(screen.getByLabelText(/Alasan Pemblokiran/i), {
      target: { value: 'Perbaikan lampu arena' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Blokir Jadwal' }))

    expect(await screen.findByText('BK-CONFLICT-05')).toBeInTheDocument()
  })
})
