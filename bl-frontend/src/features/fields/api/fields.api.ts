import { http } from '@/lib/axios'
import type { ApiResponse, Paginated } from '@/types/api.types'
import type {
  AvailabilitySlot,
  Facility,
  FieldDetail,
  FieldSummary,
  ListFieldsParams,
} from '../types/field.types'

export const fieldsApi = {
  async list(params: ListFieldsParams = {}): Promise<Paginated<FieldSummary>> {
    const query: Record<string, unknown> = { ...params }
    if (params.facility_ids && params.facility_ids.length > 0) {
      query.facility_ids = params.facility_ids.join(',')
    } else {
      delete query.facility_ids
    }
    const { data } = await http.get<ApiResponse<Paginated<FieldSummary>>>('/fields', {
      params: query,
    })
    return data.data
  },

  async getById(id: number | string): Promise<FieldDetail> {
    const { data } = await http.get<ApiResponse<FieldDetail>>(`/fields/${id}`)
    return data.data
  },

  async listFacilities(): Promise<Facility[]> {
    const { data } = await http.get<ApiResponse<Facility[]>>('/facilities')
    return data.data
  },

  async getAvailability(id: number | string, date: string): Promise<AvailabilitySlot[]> {
    const { data } = await http.get<ApiResponse<AvailabilitySlot[]>>(`/fields/${id}/availability`, {
      params: { date },
    })
    return data.data
  },
}
