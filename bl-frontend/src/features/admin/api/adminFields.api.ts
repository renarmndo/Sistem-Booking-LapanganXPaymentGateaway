import { http } from '@/lib/axios'
import type { ApiResponse, Paginated } from '@/types/api.types'
import type {
  AdminFacility,
  AdminFieldDetail,
  AdminFieldPhoto,
  AdminFieldPrice,
  AdminFieldSummary,
  AdminListFieldsParams,
  AdminOperatingHour,
  CreateFieldRequest,
  FacilityRequest,
  FieldPriceInput,
  FieldStatusResponse,
  OperatingHourInput,
  UpdateFieldRequest,
} from '../types/admin.types'

export const adminFieldsApi = {
  async listFields(params: AdminListFieldsParams = {}): Promise<Paginated<AdminFieldSummary>> {
    const query: Record<string, unknown> = { ...params }
    if (params.is_active === undefined) {
      delete query.is_active
    }
    const { data } = await http.get<ApiResponse<Paginated<AdminFieldSummary>>>('/admin/fields', {
      params: query,
    })
    return data.data
  },

  async getField(id: number | string): Promise<AdminFieldDetail> {
    const { data } = await http.get<ApiResponse<AdminFieldDetail>>(`/admin/fields/${id}`)
    return data.data
  },

  async createField(payload: CreateFieldRequest): Promise<AdminFieldDetail> {
    const { data } = await http.post<ApiResponse<AdminFieldDetail>>('/admin/fields', payload)
    return data.data
  },

  async updateField(id: number | string, payload: UpdateFieldRequest): Promise<AdminFieldDetail> {
    const { data } = await http.put<ApiResponse<AdminFieldDetail>>(`/admin/fields/${id}`, payload)
    return data.data
  },

  async deleteField(id: number | string): Promise<void> {
    await http.delete<ApiResponse<null>>(`/admin/fields/${id}`)
  },

  async updateFieldStatus(id: number | string, isActive: boolean): Promise<FieldStatusResponse> {
    const { data } = await http.put<ApiResponse<FieldStatusResponse>>(
      `/admin/fields/${id}/status`,
      { is_active: isActive },
    )
    return data.data
  },

  async setFieldFacilities(id: number | string, facilityIds: number[]): Promise<void> {
    await http.put<ApiResponse<null>>(`/admin/fields/${id}/facilities`, {
      facility_ids: facilityIds,
    })
  },

  async setFieldPrices(
    id: number | string,
    prices: FieldPriceInput[],
  ): Promise<AdminFieldPrice[]> {
    const { data } = await http.put<ApiResponse<AdminFieldPrice[]>>(
      `/admin/fields/${id}/prices`,
      { prices },
    )
    return data.data
  },

  async setFieldOperatingHours(
    id: number | string,
    operatingHours: OperatingHourInput[],
  ): Promise<AdminOperatingHour[]> {
    const { data } = await http.put<ApiResponse<AdminOperatingHour[]>>(
      `/admin/fields/${id}/operating-hours`,
      { operating_hours: operatingHours },
    )
    return data.data
  },

  async listFacilities(): Promise<AdminFacility[]> {
    const { data } = await http.get<ApiResponse<AdminFacility[]>>('/admin/facilities')
    return data.data
  },

  async createFacility(payload: FacilityRequest): Promise<AdminFacility> {
    const { data } = await http.post<ApiResponse<AdminFacility>>('/admin/facilities', payload)
    return data.data
  },

  async updateFacility(id: number | string, payload: FacilityRequest): Promise<AdminFacility> {
    const { data } = await http.put<ApiResponse<AdminFacility>>(`/admin/facilities/${id}`, payload)
    return data.data
  },

  async deleteFacility(id: number | string): Promise<void> {
    await http.delete<ApiResponse<null>>(`/admin/facilities/${id}`)
  },

  async uploadPhoto(
    fieldId: number | string,
    file: File,
    isCover = false,
  ): Promise<AdminFieldPhoto> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('is_cover', isCover ? 'true' : 'false')
    const { data } = await http.post<ApiResponse<AdminFieldPhoto>>(
      `/admin/fields/${fieldId}/photos`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return data.data
  },

  async deletePhoto(fieldId: number | string, photoId: number | string): Promise<void> {
    await http.delete<ApiResponse<null>>(`/admin/fields/${fieldId}/photos/${photoId}`)
  },

  async reorderPhotos(fieldId: number | string, photoIds: number[]): Promise<void> {
    await http.put<ApiResponse<null>>(`/admin/fields/${fieldId}/photos/order`, {
      photo_ids: photoIds,
    })
  },

  async setCoverPhoto(fieldId: number | string, photoId: number | string): Promise<void> {
    await http.put<ApiResponse<null>>(`/admin/fields/${fieldId}/photos/${photoId}/cover`)
  },
}
