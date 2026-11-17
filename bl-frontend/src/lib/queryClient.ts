import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) {
    return false
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status && status >= 400 && status < 500) {
      return false
    }
  }
  return true
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})
