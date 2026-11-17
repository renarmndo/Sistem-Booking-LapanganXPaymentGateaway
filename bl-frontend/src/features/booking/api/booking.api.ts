import { http } from '@/lib/axios'
import type { ApiResponse, Paginated } from '@/types/api.types'
import type {
  BookingDetail,
  CreateBookingPayload,
  CreateBookingResponse,
} from '../types/booking.types'

export interface ListMyBookingsParams {
  status?: string
  page?: number
  limit?: number
}

export interface CancelBookingResponse {
  id: number
  code: string
  status: 'CANCELLED'
  refund_percent: number
  refund_amount: number
}

export interface SnapPayResponse {
  order_id: string
  snap_token: string
  redirect_url: string
  expires_at?: string | null
}

export interface SyncPaymentResponse {
  order_id: string
  payment_status: string
  booking_status: string
  needs_review: boolean
}

export const bookingApi = {
  async create(payload: CreateBookingPayload): Promise<CreateBookingResponse> {
    const { data } = await http.post<ApiResponse<CreateBookingResponse>>('/bookings', payload)
    return data.data
  },

  async listMine(params: ListMyBookingsParams = {}): Promise<Paginated<BookingDetail>> {
    const query: Record<string, unknown> = { ...params }
    if (!params.status) {
      delete query.status
    }
    const { data } = await http.get<ApiResponse<Paginated<BookingDetail>>>('/bookings/me', {
      params: query,
    })
    return data.data
  },

  async getById(id: number | string): Promise<BookingDetail> {
    const { data } = await http.get<ApiResponse<BookingDetail>>(`/bookings/${id}`)
    return data.data
  },

  async cancel(id: number | string, reason?: string): Promise<CancelBookingResponse> {
    const { data } = await http.post<ApiResponse<CancelBookingResponse>>(
      `/bookings/${id}/cancel`,
      reason ? { reason } : {},
    )
    return data.data
  },

  async pay(id: number | string): Promise<SnapPayResponse> {
    const { data } = await http.post<ApiResponse<SnapPayResponse>>(`/bookings/${id}/pay`)
    return data.data
  },

  async syncPayment(id: number | string): Promise<SyncPaymentResponse> {
    const { data } = await http.post<ApiResponse<SyncPaymentResponse>>(
      `/bookings/${id}/sync-payment`,
    )
    return data.data
  },
}
