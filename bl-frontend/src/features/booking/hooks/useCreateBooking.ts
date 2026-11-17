import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { useToast } from '@/components/ui'
import { queryKeys } from '@/constants/queryKeys'
import { getErrorMessage } from '@/utils/error'
import { bookingApi, type ListMyBookingsParams } from '../api/booking.api'
import { useCheckoutDraftStore } from '../store/checkoutDraft.store'
import type { CreateBookingPayload } from '../types/booking.types'

export function useMyBookings(params: ListMyBookingsParams = {}) {
  return useQuery({
    queryKey: queryKeys.bookings.myList(params as Record<string, unknown>),
    queryFn: () => bookingApi.listMine(params),
  })
}

export function useBookingDetail(id: number | string) {
  return useQuery({
    queryKey: queryKeys.bookings.detail(id),
    queryFn: () => bookingApi.getById(id),
    enabled: Boolean(id),
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason?: string }) =>
      bookingApi.cancel(id, reason),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.fields.all })
      toast.success(
        res.refund_amount > 0
          ? `Booking ${res.code} dibatalkan (estimasi refund ${res.refund_percent}%).`
          : `Booking ${res.code} berhasil dibatalkan.`,
      )
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Gagal membatalkan booking.'))
    },
  })
}

export function useCreateBooking() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const clearDraft = useCheckoutDraftStore((s) => s.clearDraft)

  return useMutation({
    mutationFn: (payload: CreateBookingPayload) => bookingApi.create(payload),
    onSuccess: (res, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.fields.availability(variables.field_id, variables.date),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
      clearDraft()
      toast.success('Booking berhasil dibuat! Silakan selesaikan pembayaran.')
      navigate(PATHS.PAYMENT_STATUS(res.booking_id), {
        replace: true,
        state: { createdBooking: res },
      })
    },
    onError: (err, variables) => {
      if (isAxiosError(err)) {
        const status = err.response?.status
        if (status === 409) {
          toast.error('Slot baru saja diambil pengguna lain. Memuat ulang jadwal terbaru.')
          void queryClient.invalidateQueries({
            queryKey: queryKeys.fields.availability(variables.field_id, variables.date),
          })
          navigate(PATHS.FIELD_DETAIL(variables.field_id), { replace: true })
          return
        }
        if (status === 429) {
          toast.warning('Terlalu banyak percobaan booking. Silakan tunggu beberapa saat.')
          return
        }
      }
      toast.error(getErrorMessage(err, 'Gagal membuat booking.'))
    },
  })
}
