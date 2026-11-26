import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import { http } from '@/lib/axios'
import type { ApiResponse } from '@/types/api.types'
import type { DateAvailabilitySummary, SlotAvailability } from '../types/booking.types'

export function useAvailability(fieldId: number | string, date: string) {
  return useQuery({
    queryKey: queryKeys.fields.availability(fieldId, date),
    queryFn: async () => {
      const { data } = await http.get<ApiResponse<SlotAvailability[]>>(
        `/fields/${fieldId}/availability`,
        { params: { date } },
      )
      return data.data
    },
    enabled: Boolean(fieldId && date),
    refetchInterval: 12_000,
    refetchIntervalInBackground: false,
  })
}

export function useAvailabilitySummary(fieldId: number | string) {
  return useQuery({
    queryKey: ['fields', 'availability-summary', fieldId] as const,
    queryFn: async () => {
      const { data } = await http.get<ApiResponse<DateAvailabilitySummary[]>>(
        `/fields/${fieldId}/availability-summary`,
      )
      return data.data
    },
    enabled: Boolean(fieldId),
    staleTime: 15_000,
  })
}
