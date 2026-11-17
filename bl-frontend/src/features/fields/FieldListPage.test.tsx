import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { PATHS } from '@/app/router/paths'
import { FieldListPage } from './pages/FieldListPage'

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderList(initialUrl: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path={PATHS.FIELDS} element={<FieldListPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('FieldListPage', () => {
  it('syncs URL query params with API request and resets empty state filters', async () => {
    let seenSurface: string | null = null
    let seenSort: string | null = null

    server.use(
      mswHttp.get('/api/v1/facilities', () =>
        HttpResponse.json({
          success: true,
          message: 'OK',
          data: [{ id: 1, name: 'Toilet', icon: 'bath' }],
        }),
      ),
      mswHttp.get('/api/v1/fields', ({ request }) => {
        const url = new URL(request.url)
        seenSurface = url.searchParams.get('surface_type')
        seenSort = url.searchParams.get('sort')

        if (seenSurface === 'Alami') {
          return HttpResponse.json({
            success: true,
            message: 'OK',
            data: { items: [], meta: { page: 1, limit: 9, total: 0, total_pages: 0 } },
          })
        }

        return HttpResponse.json({
          success: true,
          message: 'OK',
          data: {
            items: [
              {
                id: 1,
                owner_id: 10,
                name: 'Arena Sintetis A',
                slug: 'arena-sintetis-a',
                surface_type: 'Sintetis',
                capacity: 14,
                address: 'Jl. Stadion 1',
                city: 'Jakarta',
                is_active: true,
                cover_url: '',
                min_price: 175000,
                facilities: [],
              },
            ],
            meta: { page: 1, limit: 9, total: 1, total_pages: 1 },
          },
        })
      }),
    )

    renderList('/lapangan?surface_type=Alami&sort=price_asc')

    expect(await screen.findByText('Tidak ada lapangan yang cocok')).toBeInTheDocument()
    expect(seenSurface).toBe('Alami')
    expect(seenSort).toBe('price_asc')

    fireEvent.click(screen.getAllByRole('button', { name: 'Reset Filter' })[0])
    expect(await screen.findByText('Arena Sintetis A')).toBeInTheDocument()
  })
})
