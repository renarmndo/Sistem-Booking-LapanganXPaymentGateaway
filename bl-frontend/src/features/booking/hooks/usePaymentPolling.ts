import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import { bookingApi } from '../api/booking.api'
import type { BookingStatus } from '../types/booking.types'

const FINAL_STATUSES: BookingStatus[] = ['CONFIRMED', 'EXPIRED', 'CANCELLED', 'COMPLETED']
const POLL_INTERVAL_MS = 3_000
const SYNC_AFTER_POLLS = 3
const MAX_POLL_DURATION_MS = 60_000

export function usePaymentPolling(bookingId: number | string, initialPolling = false) {
  const queryClient = useQueryClient()
  const [isPolling, setIsPolling] = useState(initialPolling)
  const pollCountRef = useRef(0)
  const startedAtRef = useRef<number>(0)
  const syncedRef = useRef(false)

  const startPolling = () => {
    pollCountRef.current = 0
    syncedRef.current = false
    startedAtRef.current = Date.now()
    setIsPolling(true)
  }

  const stopPolling = () => {
    setIsPolling(false)
  }

  const query = useQuery({
    queryKey: queryKeys.bookings.detail(bookingId),
    queryFn: async () => {
      const detail = await bookingApi.getById(bookingId)
      if (isPolling) {
        pollCountRef.current += 1
        if (
          detail.status === 'PENDING_PAYMENT' &&
          pollCountRef.current >= SYNC_AFTER_POLLS &&
          !syncedRef.current
        ) {
          syncedRef.current = true
          try {
            await bookingApi.syncPayment(bookingId)
            return await bookingApi.getById(bookingId)
          } catch {
            // Keep polling result on sync fallback error
          }
        }
      }
      return detail
    },
    enabled: Boolean(bookingId),
    refetchInterval: (q) => {
      if (!isPolling) return false
      const status = q.state.data?.status
      if (status && FINAL_STATUSES.includes(status)) {
        return false
      }
      if (startedAtRef.current > 0 && Date.now() - startedAtRef.current > MAX_POLL_DURATION_MS) {
        return false
      }
      return POLL_INTERVAL_MS
    },
  })

  const currentStatus = query.data?.status
  useEffect(() => {
    if (isPolling && currentStatus && FINAL_STATUSES.includes(currentStatus)) {
      const t = window.setTimeout(() => setIsPolling(false), 0)
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
      return () => window.clearTimeout(t)
    }
  }, [isPolling, currentStatus, queryClient])

  return {
    booking: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isPolling,
    startPolling,
    stopPolling,
  }
}
