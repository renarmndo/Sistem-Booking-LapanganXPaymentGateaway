export interface OwnerFieldItem {
  id: number
  name: string
  slug: string
  surface_type: string
  capacity: number
  is_active: boolean
  cover_url: string
  month_revenue: number
  month_utilization: number
}

export interface OwnerScheduleBooking {
  id: number
  code: string
  field_id: number
  field_name: string
  booking_date: string
  start_time: string
  end_time: string
  status: string
  source: string
  customer_name: string
  total_amount: number
}

export interface OwnerScheduleBlock {
  id: number
  field_id: number
  start_datetime: string
  end_datetime: string
  reason: string
}

export interface OwnerScheduleResponse {
  from: string
  to: string
  bookings: OwnerScheduleBooking[]
  blocks: OwnerScheduleBlock[]
}

export interface OwnerBookingItem {
  id: number
  code: string
  field_id: number
  field_name: string
  booking_date: string
  start_time: string
  end_time: string
  total_amount: number
  status: string
  source: string
  customer_name: string
  customer_phone: string
  payment_status: string
  payment_method: string
  created_at: string
}

export interface OwnerTransactionItem {
  id: number
  booking_id: number
  booking_code: string
  field_id: number
  field_name: string
  order_id: string
  method: string
  channel: string
  amount: number
  status: string
  paid_at: string | null
  created_at: string
}

export interface OwnerTransactionsResponse {
  items: OwnerTransactionItem[]
  total_paid: number
  meta: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface FieldUtilizationCalc {
  field_id: number
  field_name: string
  used_hours: number
  operational_hours: number
  blocked_hours: number
  available_hours: number
  utilization_percent: number
}

export interface OwnerDashboardSummary {
  from: string
  to: string
  total_revenue: number
  previous_revenue: number
  revenue_growth_pct: number
  total_bookings: number
  average_utilization: number
  upcoming_bookings: OwnerScheduleBooking[]
  field_utilizations: FieldUtilizationCalc[]
}

export interface RevenuePoint {
  period: string
  online_revenue: number
  offline_revenue: number
  total_revenue: number
  bookings: number
}

export interface RevenueReportResponse {
  from: string
  to: string
  group: 'day' | 'month'
  total_revenue: number
  online_revenue: number
  offline_revenue: number
  previous_revenue: number
  revenue_growth_pct: number
  series: RevenuePoint[]
}

export interface HeatmapCell {
  day_of_week: number
  hour: string
  count: number
}

export interface UtilizationReportResponse {
  from: string
  to: string
  average_utilization: number
  fields: FieldUtilizationCalc[]
  heatmap: HeatmapCell[]
  quiet_hours: string[]
}
