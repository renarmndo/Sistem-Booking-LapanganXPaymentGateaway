import { http as mswHttp, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { useAuthStore, type AuthUser } from '@/features/auth'
import { http, setUnauthorizedHandler } from '@/lib/axios'

const mockUser: AuthUser = {
  id: 1,
  name: 'Budi Santoso',
  email: 'budi@example.com',
  phone: '081234567890',
  role: 'user',
  verification_status: 'VERIFIED',
}

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  useAuthStore.getState().clear()
  vi.restoreAllMocks()
})
afterAll(() => server.close())

describe('http axios interceptor', () => {
  it('refreshes token once on 401, queues concurrent requests, and retries with new token', async () => {
    useAuthStore.getState().setSession(mockUser, 'expired-token')

    let refreshCount = 0
    server.use(
      mswHttp.post('/api/v1/auth/refresh', () => {
        refreshCount += 1
        return HttpResponse.json({
          success: true,
          message: 'Token berhasil diperbarui',
          data: {
            access_token: 'fresh-token',
            expires_in: 900,
            user: mockUser,
          },
        })
      }),
      mswHttp.get('/api/v1/auth/me', ({ request }) => {
        if (request.headers.get('Authorization') !== 'Bearer fresh-token') {
          return HttpResponse.json(
            { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 },
          )
        }
        return HttpResponse.json({ success: true, message: 'OK', data: mockUser })
      }),
      mswHttp.get('/api/v1/bookings', ({ request }) => {
        if (request.headers.get('Authorization') !== 'Bearer fresh-token') {
          return HttpResponse.json(
            { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 },
          )
        }
        return HttpResponse.json({ success: true, message: 'OK', data: [] })
      }),
    )

    const [meRes, bookingsRes] = await Promise.all([
      http.get('/auth/me'),
      http.get('/bookings'),
    ])

    expect(refreshCount).toBe(1)
    expect(meRes.status).toBe(200)
    expect(bookingsRes.status).toBe(200)
    expect(useAuthStore.getState().accessToken).toBe('fresh-token')
  })

  it('clears auth session and triggers unauthorized handler when refresh fails', async () => {
    useAuthStore.getState().setSession(mockUser, 'expired-token')
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    server.use(
      mswHttp.get('/api/v1/auth/me', () =>
        HttpResponse.json(
          { success: false, message: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 },
        ),
      ),
      mswHttp.post('/api/v1/auth/refresh', () =>
        HttpResponse.json(
          { success: false, message: 'Refresh token tidak valid', code: 'INVALID_REFRESH_TOKEN' },
          { status: 401 },
        ),
      ),
    )

    await expect(http.get('/auth/me')).rejects.toThrow()

    expect(useAuthStore.getState().accessToken).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().role).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
