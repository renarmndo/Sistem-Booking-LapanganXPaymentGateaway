import { useQuery } from '@tanstack/react-query'
import { ownerApi } from '../api/owner.api'

export function useOwnerFields() {
  return useQuery({
    queryKey: ['owner', 'fields'],
    queryFn: () => ownerApi.listFields(),
  })
}

export function useOwnerDashboardSummary(params: { field_id?: number; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['owner', 'summary', params],
    queryFn: () => ownerApi.getDashboardSummary(params),
  })
}

export function useOwnerSchedule(params: { field_id?: number; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['owner', 'schedule', params],
    queryFn: () => ownerApi.getSchedule(params),
  })
}

export function useOwnerBookings(params: {
  field_id?: number
  status?: string
  source?: string
  from?: string
  to?: string
  q?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['owner', 'bookings', params],
    queryFn: () => ownerApi.listBookings(params),
  })
}

export function useOwnerTransactions(params: {
  field_id?: number
  status?: string
  method?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['owner', 'transactions', params],
    queryFn: () => ownerApi.listTransactions(params),
  })
}

export function useOwnerRevenue(params: {
  field_id?: number
  from?: string
  to?: string
  group?: 'day' | 'month'
}) {
  return useQuery({
    queryKey: ['owner', 'revenue', params],
    queryFn: () => ownerApi.getRevenue(params),
  })
}

export function useOwnerUtilization(params: { field_id?: number; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['owner', 'utilization', params],
    queryFn: () => ownerApi.getUtilization(params),
  })
}
