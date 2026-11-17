import type { BookingStatus } from '@/features/booking'

export interface PendingDashboardBooking {
  id: number
  code: string
  field_name: string
  total_amount: number
  expires_at: string | null
}

export interface DailyTrendPoint {
  date: string
  bookings: number
  revenue: number
}

export interface TopFieldMetric {
  field_id: number
  field_name: string
  bookings: number
  revenue: number
}

export interface PeakHourMetric {
  hour: string
  bookings: number
}

export interface AdminDashboardSummary {
  from: string
  to: string
  total_bookings: number
  online_bookings: number
  offline_bookings: number
  paid_revenue: number
  needs_review_count: number
  status_counts: Record<string, number>
  pending_bookings: PendingDashboardBooking[]
  daily_trend: DailyTrendPoint[]
  top_fields: TopFieldMetric[]
  peak_hours: PeakHourMetric[]
}

export interface ScheduleBlock {
  id: number
  field_id: number
  start_datetime: string
  end_datetime: string
  reason: string
  created_by?: number
  created_at: string
}

export interface ConflictingBookingInfo {
  id: number
  code: string
  status: string
  booking_date: string
  start_time: string
  end_time: string
}

export interface CreateScheduleBlockPayload {
  field_id: number
  start_datetime: string
  end_datetime: string
  reason: string
}

export interface UpdateScheduleBlockPayload {
  start_datetime: string
  end_datetime: string
  reason: string
}

export interface CreateOfflineBookingPayload {
  field_id: number
  date: string
  slots: Array<{ start_time: string; end_time: string }>
  customer: {
    user_id?: number
    guest_name?: string
    guest_phone?: string
  }
  payment: {
    method: 'cash' | 'transfer_manual'
    status: 'paid' | 'partial' | 'unpaid'
    amount_paid: number
    note?: string
  }
}

export interface AdminBookingLog {
  id: number
  actor_id?: number
  action: string
  from_status: string
  to_status: string
  note: string
  created_at: string
}

export interface AdminBookingItem {
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
  status: BookingStatus
  source: 'online' | 'offline'
  expires_at: string | null
  cancelled_at: string | null
  cancel_reason: string
  slots: Array<{ start_time: string; end_time: string; price: number }>
  payment: { provider: string; status: string }
  refund?: { status: string; amount: number; reason?: string } | null
  user_id?: number
  customer_name: string
  customer_phone: string
  paid_amount: number
  logs?: AdminBookingLog[]
  created_at: string
}

export interface AdminBookingsParams {
  date?: string
  from?: string
  to?: string
  field_id?: number
  status?: string
  payment_status?: string
  source?: string
  q?: string
  sort?: string
  page?: number
  limit?: number
}

export interface RecordAdminPaymentPayload {
  amount: number
  method: 'cash' | 'transfer_manual'
  note?: string
}

export interface RecordAdminPaymentResponse {
  booking_id: number
  payment_status: string
  paid_total: number
  total_amount: number
  remaining: number
}

export interface AdminCancelBookingPayload {
  reason: string
  create_refund?: boolean
  refund_amount?: number
}

export interface AdminUserItem {
  id: number
  name: string
  email: string
  phone: string
  role: 'user' | 'admin' | 'owner'
  is_active: boolean
  verification_status: string
  created_at: string
}

export interface AdminUserDetail extends AdminUserItem {
  total_bookings: number
  total_spent: number
}

export interface AdminUsersParams {
  role?: string
  is_active?: string
  q?: string
  page?: number
  limit?: number
}

export interface CreateAdminUserPayload {
  name: string
  email: string
  phone: string
  password: string
  role: 'admin' | 'owner' | 'user'
}

export interface UpdateAdminUserPayload {
  name: string
  phone: string
  role: 'admin' | 'owner' | 'user'
  is_active: boolean
}

export interface AdminTransactionItem {
  id: number
  booking_id: number
  booking_code: string
  field_name: string
  order_id: string
  method: string
  channel: string
  amount: number
  status: string
  transaction_id: string
  needs_review: boolean
  paid_at: string | null
  recorded_by?: number
  created_at: string
}

export interface AdminTransactionSummary {
  total_paid_amount: number
  total_count: number
  needs_review_count: number
}

export interface AdminTransactionsResponse {
  items: AdminTransactionItem[]
  summary: AdminTransactionSummary
  meta: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface AdminTransactionLog {
  id: number
  payment_id: number
  event: string
  raw_payload: string
  created_at: string
}

export interface AdminTransactionDetail extends AdminTransactionItem {
  logs: AdminTransactionLog[]
}

export interface AdminTransactionsParams {
  from?: string
  to?: string
  status?: string
  method?: string
  field_id?: number
  q?: string
  page?: number
  limit?: number
}

export interface AdminRefundItem {
  id: number
  booking_id: number
  booking_code: string
  payment_id: number
  amount: number
  status: 'pending' | 'processed' | 'rejected'
  reason: string
  processed_by?: number
  processed_at?: string | null
  note: string
  created_at: string
}

export interface AdminSettingItem {
  id: number
  setting_key: string
  setting_value: string
  description: string
}
