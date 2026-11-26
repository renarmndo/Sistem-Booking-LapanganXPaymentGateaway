export type SlotStatus = 'available' | 'past' | 'locked' | 'booked' | 'blocked'

export interface SlotAvailability {
  start_time: string
  end_time: string
  price: number
  status: SlotStatus
}

export interface DateAvailabilitySummary {
  date: string
  available_slots: number
  total_slots: number
}

export type PaymentType = 'full' | 'dp'

export interface CreateBookingPayload {
  field_id: number
  date: string
  slots: Array<{ start_time: string; end_time: string }>
  payment_type?: PaymentType
}

export interface PaymentStubResult {
  provider: string
  token: string
  redirect_url: string
}

export interface CreateBookingResponse {
  booking_id: number
  code: string
  total: number
  pay_amount?: number
  payment_type?: PaymentType
  expires_at: string
  payment: PaymentStubResult
}

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'COMPLETED'

export interface BookingDetail {
  id: number
  code: string
  field: {
    id: number
    name: string
    slug: string
    surface_type: string
    cover_url: string
  }
  booking_date: string
  start_time: string
  end_time: string
  total_amount: number
  paid_amount?: number
  status: BookingStatus
  source: 'online' | 'offline'
  expires_at: string | null
  cancelled_at: string | null
  cancel_reason: string
  slots: Array<{ start_time: string; end_time: string; price: number }>
  payment: { provider: string; status: string; channel?: string; amount?: number }
  refund?: { status: string; amount: number; reason?: string } | null
  created_at: string
}
