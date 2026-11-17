import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ToastProvider } from '@/components/ui'
import { OwnerFieldsPage } from './pages/OwnerFieldsPage'
import { OwnerUtilizationPage } from './pages/OwnerUtilizationPage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function wrap(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 6 Owner Dashboard & Reports (Read-Only)', () => {
  it('renders OwnerFieldsPage strictly read-only without write action buttons', async () => {
    server.use(
      mswHttp.get('/api/v1/owner/fields', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: [
            {
              id: 1,
              name: 'Lapangan Utama Noel',
              slug: 'lapangan-utama-noel',
              surface_type: 'Vinyl',
              capacity: 10,
              is_active: true,
              cover_url: '',
              month_revenue: 4500000,
              month_utilization: 62.5,
            },
          ],
        }),
      ),
    )

    wrap(<OwnerFieldsPage />)

    expect(await screen.findByText('Lapangan Utama Noel')).toBeInTheDocument()
    expect(screen.getByText('62.5%')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit|hapus|tambah|batalkan/i })).not.toBeInTheDocument()
  })

  it('renders OwnerUtilizationPage with ranking, quiet hours, and heatmap cells', async () => {
    server.use(
      mswHttp.get('/api/v1/owner/fields', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: [
            {
              id: 1,
              name: 'Lapangan Utama Noel',
              slug: 'lapangan-utama-noel',
              surface_type: 'Vinyl',
              capacity: 10,
              is_active: true,
              cover_url: '',
              month_revenue: 4500000,
              month_utilization: 62.5,
            },
          ],
        }),
      ),
      mswHttp.get('/api/v1/owner/utilization', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            from: '2026-11-01',
            to: '2026-11-17',
            average_utilization: 55.5,
            fields: [
              {
                field_id: 1,
                field_name: 'Lapangan Utama Noel',
                used_hours: 50,
                operational_hours: 100,
                blocked_hours: 10,
                available_hours: 90,
                utilization_percent: 55.56,
              },
            ],
            heatmap: [{ day_of_week: 1, hour: '19:00', count: 8 }],
            quiet_hours: ['08:00', '09:00'],
          },
        }),
      ),
    )

    wrap(<OwnerUtilizationPage />)

    expect(await screen.findByText(/#1 Lapangan Utama Noel/i)).toBeInTheDocument()
    expect(screen.getByText('55.56%')).toBeInTheDocument()
    expect(screen.getByText('08:00')).toBeInTheDocument()
    expect(screen.getByTitle('Sen 19:00: 8 slot')).toHaveTextContent('8')
  })
})
