import { http } from '@/lib/axios'
import type { ApiResponse, Paginated } from '@/types/api.types'
import type {
  AdminBookingItem,
  AdminBookingsParams,
  AdminCancelBookingPayload,
  AdminDashboardSummary,
  AdminRefundItem,
  AdminSettingItem,
  AdminTransactionDetail,
  AdminTransactionsParams,
  AdminTransactionsResponse,
  AdminUserDetail,
  AdminUserItem,
  AdminUsersParams,
  CreateAdminUserPayload,
  CreateOfflineBookingPayload,
  CreateScheduleBlockPayload,
  RecordAdminPaymentPayload,
  RecordAdminPaymentResponse,
  ScheduleBlock,
  UpdateAdminUserPayload,
  UpdateScheduleBlockPayload,
} from '../types/adminOps.types'

export const adminOpsApi = {
  async getDashboardSummary(from?: string, to?: string): Promise<AdminDashboardSummary> {
    const { data } = await http.get<ApiResponse<AdminDashboardSummary>>('/admin/dashboard/summary', {
      params: { from: from || undefined, to: to || undefined },
    })
    return data.data
  },

  async listScheduleBlocks(params: { field_id?: number; from?: string; to?: string; page?: number; limit?: number } = {}): Promise<Paginated<ScheduleBlock>> {
    const { data } = await http.get<ApiResponse<Paginated<ScheduleBlock>>>('/admin/schedule-blocks', {
      params,
    })
    return data.data
  },

  async createScheduleBlock(payload: CreateScheduleBlockPayload): Promise<ScheduleBlock> {
    const { data } = await http.post<ApiResponse<ScheduleBlock>>('/admin/schedule-blocks', payload)
    return data.data
  },

  async updateScheduleBlock(id: number, payload: UpdateScheduleBlockPayload): Promise<ScheduleBlock> {
    const { data } = await http.put<ApiResponse<ScheduleBlock>>(`/admin/schedule-blocks/${id}`, payload)
    return data.data
  },

  async deleteScheduleBlock(id: number): Promise<void> {
    await http.delete(`/admin/schedule-blocks/${id}`)
  },

  async createOfflineBooking(payload: CreateOfflineBookingPayload): Promise<AdminBookingItem> {
    const { data } = await http.post<ApiResponse<AdminBookingItem>>('/admin/bookings/offline', payload)
    return data.data
  },

  async listBookings(params: AdminBookingsParams = {}): Promise<Paginated<AdminBookingItem>> {
    const cleanParams: Record<string, unknown> = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') cleanParams[k] = v
    })
    const { data } = await http.get<ApiResponse<Paginated<AdminBookingItem>>>('/admin/bookings', {
      params: cleanParams,
    })
    return data.data
  },

  async getBookingDetail(id: number): Promise<AdminBookingItem> {
    const { data } = await http.get<ApiResponse<AdminBookingItem>>(`/admin/bookings/${id}`)
    return data.data
  },

  async recordPayment(bookingId: number, payload: RecordAdminPaymentPayload): Promise<RecordAdminPaymentResponse> {
    const { data } = await http.post<ApiResponse<RecordAdminPaymentResponse>>(
      `/admin/bookings/${bookingId}/payments`,
      payload,
    )
    return data.data
  },

  async cancelBooking(bookingId: number, payload: AdminCancelBookingPayload): Promise<void> {
    await http.post(`/admin/bookings/${bookingId}/cancel`, payload)
  },

  async listUsers(params: AdminUsersParams = {}): Promise<Paginated<AdminUserItem>> {
    const cleanParams: Record<string, unknown> = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') cleanParams[k] = v
    })
    const { data } = await http.get<ApiResponse<Paginated<AdminUserItem>>>('/admin/users', {
      params: cleanParams,
    })
    return data.data
  },

  async getUserDetail(id: number): Promise<AdminUserDetail> {
    const { data } = await http.get<ApiResponse<AdminUserDetail>>(`/admin/users/${id}`)
    return data.data
  },

  async createUser(payload: CreateAdminUserPayload): Promise<AdminUserItem> {
    const { data } = await http.post<ApiResponse<AdminUserItem>>('/admin/users', payload)
    return data.data
  },

  async updateUser(id: number, payload: UpdateAdminUserPayload): Promise<AdminUserItem> {
    const { data } = await http.put<ApiResponse<AdminUserItem>>(`/admin/users/${id}`, payload)
    return data.data
  },

  async resetUserPassword(id: number, newPassword: string): Promise<void> {
    await http.post(`/admin/users/${id}/reset-password`, { new_password: newPassword })
  },

  async listTransactions(params: AdminTransactionsParams = {}): Promise<AdminTransactionsResponse> {
    const cleanParams: Record<string, unknown> = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') cleanParams[k] = v
    })
    const { data } = await http.get<ApiResponse<AdminTransactionsResponse>>('/admin/transactions', {
      params: cleanParams,
    })
    return data.data
  },

  async exportTransactionsCsv(params: AdminTransactionsParams = {}): Promise<Blob> {
    const cleanParams: Record<string, unknown> = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') cleanParams[k] = v
    })
    const { data } = await http.get<Blob>('/admin/transactions/export', {
      params: cleanParams,
      responseType: 'blob',
    })
    return data
  },

  async getTransactionDetail(id: number): Promise<AdminTransactionDetail> {
    const { data } = await http.get<ApiResponse<AdminTransactionDetail>>(`/admin/transactions/${id}`)
    return data.data
  },

  async listRefunds(params: { status?: string; page?: number; limit?: number } = {}): Promise<Paginated<AdminRefundItem>> {
    const { data } = await http.get<ApiResponse<Paginated<AdminRefundItem>>>('/admin/refunds', {
      params: {
        status: params.status || undefined,
        page: params.page,
        limit: params.limit,
      },
    })
    return data.data
  },

  async processRefund(id: number, action: 'process' | 'reject', note: string): Promise<AdminRefundItem> {
    const { data } = await http.put<ApiResponse<AdminRefundItem>>(`/admin/refunds/${id}`, {
      action,
      note,
    })
    return data.data
  },

  async listSettings(): Promise<AdminSettingItem[]> {
    const { data } = await http.get<ApiResponse<AdminSettingItem[]>>('/admin/settings')
    return data.data
  },

  async updateSettings(settings: Array<{ key: string; value: string; description?: string }>): Promise<AdminSettingItem[]> {
    const { data } = await http.put<ApiResponse<AdminSettingItem[]>>('/admin/settings', { settings })
    return data.data
  },
}
