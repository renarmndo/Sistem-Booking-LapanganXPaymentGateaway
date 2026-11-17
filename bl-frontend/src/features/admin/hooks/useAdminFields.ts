import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui'
import { queryKeys } from '@/constants/queryKeys'
import { getErrorMessage } from '@/utils/error'
import { adminFieldsApi } from '../api/adminFields.api'
import type {
  AdminListFieldsParams,
  CreateFieldRequest,
  FacilityRequest,
  FieldPriceInput,
  OperatingHourInput,
  UpdateFieldRequest,
} from '../types/admin.types'

export function useAdminFields(params: AdminListFieldsParams = {}) {
  return useQuery({
    queryKey: [...queryKeys.admin.fields, params],
    queryFn: () => adminFieldsApi.listFields(params),
  })
}

export function useAdminFieldDetail(id: number | string | null) {
  return useQuery({
    queryKey: ['admin', 'fields', 'detail', id],
    queryFn: () => adminFieldsApi.getField(id!),
    enabled: Boolean(id),
  })
}

export function useAdminFacilities() {
  return useQuery({
    queryKey: ['admin', 'facilities'],
    queryFn: () => adminFieldsApi.listFacilities(),
  })
}

function useInvalidateFields() {
  const queryClient = useQueryClient()
  return (fieldId?: number | string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.fields })
    void queryClient.invalidateQueries({ queryKey: queryKeys.fields.all })
    if (fieldId !== undefined) {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'fields', 'detail', fieldId] })
    }
  }
}

export function useCreateField() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: (payload: CreateFieldRequest) => adminFieldsApi.createField(payload),
    onSuccess: () => {
      invalidate()
      toast.success('Lapangan berhasil ditambahkan.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateField() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: UpdateFieldRequest }) =>
      adminFieldsApi.updateField(id, payload),
    onSuccess: (_data, vars) => {
      invalidate(vars.id)
      toast.success('Data lapangan berhasil diperbarui.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteField() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: (id: number | string) => adminFieldsApi.deleteField(id),
    onSuccess: () => {
      invalidate()
      toast.success('Lapangan berhasil dihapus.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateFieldStatus() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number | string; isActive: boolean }) =>
      adminFieldsApi.updateFieldStatus(id, isActive),
    onSuccess: (res) => {
      invalidate(res.id)
      if (!res.is_active && res.upcoming_bookings_count > 0) {
        toast.warning(
          `Lapangan dinonaktifkan. Terdapat ${res.upcoming_bookings_count} booking mendatang.`,
        )
      } else {
        toast.success(res.is_active ? 'Lapangan diaktifkan.' : 'Lapangan dinonaktifkan.')
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useSetFieldFacilities() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: ({ id, facilityIds }: { id: number | string; facilityIds: number[] }) =>
      adminFieldsApi.setFieldFacilities(id, facilityIds),
    onSuccess: (_data, vars) => {
      invalidate(vars.id)
      toast.success('Fasilitas lapangan diperbarui.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useSetFieldPrices() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: ({ id, prices }: { id: number | string; prices: FieldPriceInput[] }) =>
      adminFieldsApi.setFieldPrices(id, prices),
    onSuccess: (_data, vars) => {
      invalidate(vars.id)
      toast.success('Aturan harga lapangan diperbarui.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useSetFieldOperatingHours() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: ({
      id,
      operatingHours,
    }: {
      id: number | string
      operatingHours: OperatingHourInput[]
    }) => adminFieldsApi.setFieldOperatingHours(id, operatingHours),
    onSuccess: (_data, vars) => {
      invalidate(vars.id)
      toast.success('Jam operasional 7 hari diperbarui.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUploadFieldPhoto() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: ({
      fieldId,
      file,
      isCover,
    }: {
      fieldId: number | string
      file: File
      isCover?: boolean
    }) => adminFieldsApi.uploadPhoto(fieldId, file, isCover),
    onSuccess: (_data, vars) => {
      invalidate(vars.fieldId)
      toast.success('Foto lapangan berhasil diunggah.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteFieldPhoto() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: ({ fieldId, photoId }: { fieldId: number | string; photoId: number | string }) =>
      adminFieldsApi.deletePhoto(fieldId, photoId),
    onSuccess: (_data, vars) => {
      invalidate(vars.fieldId)
      toast.success('Foto lapangan dihapus.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useSetCoverPhoto() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: ({ fieldId, photoId }: { fieldId: number | string; photoId: number | string }) =>
      adminFieldsApi.setCoverPhoto(fieldId, photoId),
    onSuccess: (_data, vars) => {
      invalidate(vars.fieldId)
      toast.success('Foto sampul diperbarui.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useReorderFieldPhotos() {
  const toast = useToast()
  const invalidate = useInvalidateFields()
  return useMutation({
    mutationFn: ({ fieldId, photoIds }: { fieldId: number | string; photoIds: number[] }) =>
      adminFieldsApi.reorderPhotos(fieldId, photoIds),
    onSuccess: (_data, vars) => {
      invalidate(vars.fieldId)
      toast.success('Urutan foto diperbarui.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useCreateFacility() {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: FacilityRequest) => adminFieldsApi.createFacility(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.fields.all })
      toast.success('Fasilitas berhasil ditambahkan.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useUpdateFacility() {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: FacilityRequest }) =>
      adminFieldsApi.updateFacility(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.fields.all })
      toast.success('Fasilitas diperbarui.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}

export function useDeleteFacility() {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: number | string) => adminFieldsApi.deleteFacility(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'facilities'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.fields.all })
      toast.success('Fasilitas dihapus.')
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  })
}
