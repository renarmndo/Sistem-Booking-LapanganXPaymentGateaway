import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import { useAuthStore, type AuthTokensResponse } from '@/features/auth'
import type { ApiResponse } from '@/types/api.types'

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

interface QueuedRequest {
  resolve: (token: string) => void
  reject: (err: unknown) => void
}

const AUTH_SKIP_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/register']

let isRefreshing = false
let pendingQueue: QueuedRequest[] = []

let unauthorizedHandler: () => void = () => {
  if (typeof window !== 'undefined' && window.location.pathname !== '/masuk') {
    window.location.assign('/masuk')
  }
}

export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

function flushQueue(error: unknown, token: string | null): void {
  for (const item of pendingQueue) {
    if (error) {
      item.reject(error)
    } else if (token) {
      item.resolve(token)
    }
  }
  pendingQueue = []
}

function shouldSkipRefresh(url?: string): boolean {
  if (!url) return false
  return AUTH_SKIP_REFRESH_PATHS.some((path) => url.includes(path))
}

const refreshClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

export const http = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined
    const status = error.response?.status

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest.url)
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((newToken) => {
        originalRequest._retry = true
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return http(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const { data } = await refreshClient.post<ApiResponse<AuthTokensResponse>>('/auth/refresh')
      const { access_token: newAccessToken, user } = data.data

      useAuthStore.getState().setSession(user, newAccessToken)
      flushQueue(null, newAccessToken)

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return http(originalRequest)
    } catch (refreshError) {
      flushQueue(refreshError, null)
      useAuthStore.getState().clear()
      unauthorizedHandler()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)
