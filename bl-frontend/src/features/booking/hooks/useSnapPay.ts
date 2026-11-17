import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { useToast } from '@/components/ui'
import { queryKeys } from '@/constants/queryKeys'
import { loadSnapScript } from '@/lib/snap'
import { getErrorMessage } from '@/utils/error'
import { bookingApi } from '../api/booking.api'

export interface UseSnapPayOptions {
  bookingId: number | string
  initialToken?: string
  onTriggerPolling?: () => void
}

export function useSnapPay({ bookingId, initialToken, onTriggerPolling }: UseSnapPayOptions) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [isOpening, setIsOpening] = useState(false)

  const openSnap = useCallback(async () => {
    setIsOpening(true)
    try {
      let token = initialToken
      let redirectUrl = ''

      if (!token) {
        const payRes = await bookingApi.pay(bookingId)
        token = payRes.snap_token
        redirectUrl = payRes.redirect_url
      }

      if (token.startsWith('stub-snap-') && redirectUrl) {
        onTriggerPolling?.()
        toast.info('Mode simulasi pembayaran aktif. Memantau status booking...')
        return
      }

      const snap = await loadSnapScript()
      snap.pay(token, {
        onSuccess: () => onTriggerPolling?.(),
        onPending: () => onTriggerPolling?.(),
        onError: () => onTriggerPolling?.(),
        onClose: () => onTriggerPolling?.(),
      })
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 422) {
        toast.error('Batas waktu pembayaran sudah berakhir. Silakan buat booking baru.')
        void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.detail(bookingId) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
        return
      }
      toast.error(getErrorMessage(err, 'Gagal membuka popup pembayaran.'))
    } finally {
      setIsOpening(false)
    }
  }, [bookingId, initialToken, onTriggerPolling, queryClient, toast])

  return { openSnap, isOpening }
}
