import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { PATHS } from '@/app/router/paths'
import { HomePage } from './HomePage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function FieldsRouteProbe() {
  const loc = useLocation()
  return <div data-testid="fields-target">{loc.pathname + loc.search}</div>
}

describe('HomePage', () => {
  it('fetches popular fields from GET /fields?sort=popular&limit=6 and navigates on search', async () => {
    server.use(
      mswHttp.get('/api/v1/fields', ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get('sort')).toBe('popular')
        expect(url.searchParams.get('limit')).toBe('6')
        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            items: [
              {
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
                facilities: [{ id: 1, name: 'Lampu', icon: 'lightbulb' }],
              },
            ],
            meta: { page: 1, limit: 6, total: 1, total_pages: 1 },
          },
        })
      }),
    )

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[PATHS.HOME]}>
          <Routes>
            <Route path={PATHS.HOME} element={<HomePage />} />
            <Route path={PATHS.FIELDS} element={<FieldsRouteProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Arena Utama A')).toBeInTheDocument()
    expect(screen.getByText(/Rp 175\.000/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tanggal Main'), { target: { value: '2026-11-20' } })
    fireEvent.click(screen.getByRole('button', { name: /Cari Jadwal/i }))

    const probe = await screen.findByTestId('fields-target')
    expect(probe.textContent).toContain('/lapangan?date=2026-11-20')
  })
})
