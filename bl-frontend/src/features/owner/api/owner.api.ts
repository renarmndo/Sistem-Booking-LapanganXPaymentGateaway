import { http } from '@/lib/axios'
import type { ApiResponse, Paginated } from '@/types/api.types'
import type {
  OwnerBookingItem,
  OwnerDashboardSummary,
  OwnerFieldItem,
  OwnerScheduleResponse,
  OwnerTransactionsResponse,
  RevenueReportResponse,
  UtilizationReportResponse,
} from '../types/owner.types'

export const ownerApi = {
  async listFields(): Promise<OwnerFieldItem[]> {
    const { data } = await http.get<ApiResponse<OwnerFieldItem[]>>('/owner/fields')
    return data.data
  },

  async getDashboardSummary(params: { field_id?: number; from?: string; to?: string } = {}): Promise<OwnerDashboardSummary> {
    const { data } = await http.get<ApiResponse<OwnerDashboardSummary>>('/owner/dashboard/summary', {
      params,
    })
    return data.data
  },

  async getSchedule(params: { field_id?: number; from?: string; to?: string } = {}): Promise<OwnerScheduleResponse> {
    const { data } = await http.get<ApiResponse<OwnerScheduleResponse>>('/owner/schedule', {
      params,
    })
    return data.data
  },

  async listBookings(params: {
    field_id?: number
    status?: string
    source?: string
    from?: string
    to?: string
    q?: string
    page?: number
    limit?: number
  } = {}): Promise<Paginated<OwnerBookingItem>> {
    const clean: Record<string, unknown> = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') clean[k] = v
    })
    const { data } = await http.get<ApiResponse<Paginated<OwnerBookingItem>>>('/owner/bookings', {
      params: clean,
    })
    return data.data
  },

  async listTransactions(params: {
    field_id?: number
    status?: string
    method?: string
    from?: string
    to?: string
    page?: number
    limit?: number
  } = {}): Promise<OwnerTransactionsResponse> {
    const clean: Record<string, unknown> = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') clean[k] = v
    })
    const { data } = await http.get<ApiResponse<OwnerTransactionsResponse>>('/owner/transactions', {
      params: clean,
    })
    return data.data
  },

  async getRevenue(params: {
    field_id?: number
    from?: string
    to?: string
    group?: 'day' | 'month'
  } = {}): Promise<RevenueReportResponse> {
    const { data } = await http.get<ApiResponse<RevenueReportResponse>>('/owner/revenue', {
      params,
    })
    return data.data
  },

  async getUtilization(params: {
    field_id?: number
    from?: string
    to?: string
  } = {}): Promise<UtilizationReportResponse> {
    const { data } = await http.get<ApiResponse<UtilizationReportResponse>>('/owner/utilization', {
      params,
    })
    return data.data
  },
}
