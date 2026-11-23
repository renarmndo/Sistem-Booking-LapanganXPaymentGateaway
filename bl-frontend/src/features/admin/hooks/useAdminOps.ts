import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui'
import { getErrorMessage } from '@/utils/error'
import { adminOpsApi } from '../api/adminOps.api'
import type {
  AdminBookingsParams,
  AdminCancelBookingPayload,
  AdminTransactionsParams,
  AdminUsersParams,
  CreateAdminUserPayload,
  CreateOfflineBookingPayload,
  CreateScheduleBlockPayload,
  RecordAdminPaymentPayload,
  UpdateAdminUserPayload,
} from '../types/adminOps.types'

export const adminOpsKeys = {
  summary: (from?: string, to?: string) => ['admin', 'summary', from ?? '', to ?? ''] as const,
  blocks: (params?: Record<string, unknown>) => ['admin', 'schedule-blocks', params ?? {}] as const,
  bookings: (params?: AdminBookingsParams) => ['admin', 'bookings', params ?? {}] as const,
  bookingDetail: (id: number | null) => ['admin', 'booking-detail', id] as const,
  users: (params?: AdminUsersParams) => ['admin', 'users', params ?? {}] as const,
  userDetail: (id: number | null) => ['admin', 'user-detail', id] as const,
  transactions: (params?: AdminTransactionsParams) => ['admin', 'transactions', params ?? {}] as const,
  transactionDetail: (id: number | null) => ['admin', 'transaction-detail', id] as const,
  refunds: (params?: Record<string, unknown>) => ['admin', 'refunds', params ?? {}] as const,
  settings: ['admin', 'settings'] as const,
}

export function useAdminDashboardSummary(from?: string, to?: string) {
  return useQuery({
    queryKey: adminOpsKeys.summary(from, to),
    queryFn: () => adminOpsApi.getDashboardSummary(from, to),
    refetchInterval: 30_000,
  })
}

export function useScheduleBlocks(params: { field_id?: number; from?: string; to?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: adminOpsKeys.blocks(params),
    queryFn: () => adminOpsApi.listScheduleBlocks(params),
  })
}

export function useCreateScheduleBlock() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: CreateScheduleBlockPayload) => adminOpsApi.createScheduleBlock(payload),
    onSuccess: () => {
      toast.success('Jadwal berhasil diblokir.')
      void qc.invalidateQueries({ queryKey: ['admin', 'schedule-blocks'] })
      void qc.invalidateQueries({ queryKey: ['fields', 'availability'] })
    },
  })
}

export function useDeleteScheduleBlock() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: number) => adminOpsApi.deleteScheduleBlock(id),
    onSuccess: () => {
      toast.success('Blokir jadwal dihapus.')
      void qc.invalidateQueries({ queryKey: ['admin', 'schedule-blocks'] })
      void qc.invalidateQueries({ queryKey: ['fields', 'availability'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menghapus blokir jadwal.')),
  })
}

export function useCreateOfflineBooking() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: CreateOfflineBookingPayload) => adminOpsApi.createOfflineBooking(payload),
    onSuccess: () => {
      toast.success('Booking offline berhasil dibuat.')
      void qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'summary'] })
      void qc.invalidateQueries({ queryKey: ['fields', 'availability'] })
    },
  })
}

export function useAdminBookings(params: AdminBookingsParams) {
  return useQuery({
    queryKey: adminOpsKeys.bookings(params),
    queryFn: () => adminOpsApi.listBookings(params),
  })
}

export function useAdminBookingDetail(id: number | null) {
  return useQuery({
    queryKey: adminOpsKeys.bookingDetail(id),
    queryFn: () => adminOpsApi.getBookingDetail(id!),
    enabled: id !== null,
  })
}

export function useRecordAdminPayment() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ bookingId, payload }: { bookingId: number; payload: RecordAdminPaymentPayload }) =>
      adminOpsApi.recordPayment(bookingId, payload),
    onSuccess: (_res, vars) => {
      toast.success('Pembayaran berhasil dicatat.')
      void qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      void qc.invalidateQueries({ queryKey: adminOpsKeys.bookingDetail(vars.bookingId) })
      void qc.invalidateQueries({ queryKey: ['admin', 'summary'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'transactions'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal mencatat pembayaran.')),
  })
}

export function useAdminCancelBooking() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ bookingId, payload }: { bookingId: number; payload: AdminCancelBookingPayload }) =>
      adminOpsApi.cancelBooking(bookingId, payload),
    onSuccess: (_res, vars) => {
      toast.success('Booking berhasil dibatalkan.')
      void qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
      void qc.invalidateQueries({ queryKey: adminOpsKeys.bookingDetail(vars.bookingId) })
      void qc.invalidateQueries({ queryKey: ['admin', 'refunds'] })
      void qc.invalidateQueries({ queryKey: ['fields', 'availability'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal membatalkan booking.')),
  })
}

export function useAdminUsers(params: AdminUsersParams) {
  return useQuery({
    queryKey: adminOpsKeys.users(params),
    queryFn: () => adminOpsApi.listUsers(params),
  })
}

export function useAdminUserDetail(id: number | null) {
  return useQuery({
    queryKey: adminOpsKeys.userDetail(id),
    queryFn: () => adminOpsApi.getUserDetail(id!),
    enabled: id !== null,
  })
}

export function useCreateAdminUser() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: CreateAdminUserPayload) => adminOpsApi.createUser(payload),
    onSuccess: () => {
      toast.success('Akun baru berhasil dibuat.')
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal membuat akun.')),
  })
}

export function useUpdateAdminUser() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateAdminUserPayload }) =>
      adminOpsApi.updateUser(id, payload),
    onSuccess: (_res, vars) => {
      toast.success('Data pengguna diperbarui.')
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      void qc.invalidateQueries({ queryKey: adminOpsKeys.userDetail(vars.id) })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal memperbarui pengguna.')),
  })
}

export function useResetAdminUserPassword() {
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      adminOpsApi.resetUserPassword(id, newPassword),
    onSuccess: () => {
      toast.success('Password pengguna berhasil direset.')
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal mereset password.')),
  })
}

export function useAdminTransactions(params: AdminTransactionsParams) {
  return useQuery({
    queryKey: adminOpsKeys.transactions(params),
    queryFn: () => adminOpsApi.listTransactions(params),
  })
}

export function useAdminTransactionDetail(id: number | null) {
  return useQuery({
    queryKey: adminOpsKeys.transactionDetail(id),
    queryFn: () => adminOpsApi.getTransactionDetail(id!),
    enabled: id !== null,
  })
}

export function useAdminRefunds(params: { status?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: adminOpsKeys.refunds(params),
    queryFn: () => adminOpsApi.listRefunds(params),
  })
}

export function useProcessAdminRefund() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: 'process' | 'reject'; note: string }) =>
      adminOpsApi.processRefund(id, action, note),
    onSuccess: () => {
      toast.success('Status refund diperbarui.')
      void qc.invalidateQueries({ queryKey: ['admin', 'refunds'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'summary'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'bookings'] })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal memproses refund.')),
  })
}

export function useAdminSettings() {
  return useQuery({
    queryKey: adminOpsKeys.settings,
    queryFn: () => adminOpsApi.listSettings(),
  })
}

export function useUpdateAdminSettings() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (settings: Array<{ key: string; value: string; description?: string }>) =>
      adminOpsApi.updateSettings(settings),
    onSuccess: () => {
      toast.success('Pengaturan Noel Futsal disimpan.')
      void qc.invalidateQueries({ queryKey: adminOpsKeys.settings })
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Gagal menyimpan pengaturan.')),
  })
}
