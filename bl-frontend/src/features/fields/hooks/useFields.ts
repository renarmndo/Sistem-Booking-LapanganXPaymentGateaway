import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/constants/queryKeys'
import { fieldsApi } from '../api/fields.api'
import type { ListFieldsParams } from '../types/field.types'

export function useFields(params: ListFieldsParams = {}) {
  return useQuery({
    queryKey: queryKeys.fields.list(params as Record<string, unknown>),
    queryFn: () => fieldsApi.list(params),
  })
}

export function useFieldDetail(id: number | string) {
  return useQuery({
    queryKey: queryKeys.fields.detail(id),
    queryFn: () => fieldsApi.getById(id),
    enabled: Boolean(id),
  })
}

export function useFacilities() {
  return useQuery({
    queryKey: ['facilities'] as const,
    queryFn: () => fieldsApi.listFacilities(),
  })
}
