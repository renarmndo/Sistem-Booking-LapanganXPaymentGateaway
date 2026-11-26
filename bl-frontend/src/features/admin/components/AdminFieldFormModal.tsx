import { useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Check, Info, Star, Trash2, Upload } from 'lucide-react'
import { PageLoader } from '@/components/shared'
import {
  Badge,
  Button,
  FormField,
  Input,
  Modal,
  Select,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui'
import { OperatingHoursEditor } from './OperatingHoursEditor'
import { PriceRuleEditor } from './PriceRuleEditor'
import {
  useAdminFacilities,
  useAdminFieldDetail,
  useCreateField,
  useDeleteFieldPhoto,
  useReorderFieldPhotos,
  useSetCoverPhoto,
  useUpdateField,
  useUploadFieldPhoto,
} from '../hooks/useAdminFields'
import { fieldFormSchema, type FieldFormValues } from '../schemas/field.schema'
import type { OperatingHourInput } from '../types/admin.types'

const SURFACE_OPTIONS = [
  { value: 'Rumput Sintetis', label: 'Rumput Sintetis' },
  { value: 'Vinyl', label: 'Vinyl' },
  { value: 'Interlock', label: 'Interlock' },
  { value: 'Parquet', label: 'Parquet' },
]

function defaultHours(): OperatingHourInput[] {
  return Array.from({ length: 7 }, (_, day) => ({
    day_of_week: day,
    open_time: '08:00',
    close_time: '23:00',
    is_closed: false,
  }))
}

function buildInitialValues(): FieldFormValues {
  return {
    name: '',
    description: '',
    address: 'Noel Futsal Arena',
    city: 'Jakarta',
    surface_type: 'Rumput Sintetis',
    capacity: 10,
    is_active: true,
    facility_ids: [],
    prices: [
      { day_type: 'weekday', start_time: '08:00', end_time: '17:00', price_per_slot: 150000 },
      { day_type: 'weekday', start_time: '17:00', end_time: '23:00', price_per_slot: 220000 },
      { day_type: 'weekend', start_time: '08:00', end_time: '23:00', price_per_slot: 250000 },
    ],
    operating_hours: defaultHours(),
  }
}

export interface AdminFieldFormModalProps {
  open: boolean
  fieldId: number | null
  onClose: () => void
}

export function AdminFieldFormModal({ open, fieldId, onClose }: AdminFieldFormModalProps) {
  const isEdit = fieldId !== null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Lapangan Noel Futsal' : 'Tambah Lapangan Noel Futsal'}
      description="Atur informasi lapangan, fasilitas, tarif per jam, jam operasional, dan foto."
      size="xl"
      closeOnBackdrop={false}
    >
      {open ? (
        <AdminFieldFormContent key={fieldId ?? 'create'} fieldId={fieldId} onClose={onClose} />
      ) : null}
    </Modal>
  )
}

function AdminFieldFormContent({
  fieldId,
  onClose,
}: {
  fieldId: number | null
  onClose: () => void
}) {
  const isEdit = fieldId !== null
  const toast = useToast()

  const detailQuery = useAdminFieldDetail(fieldId)
  const facilitiesQuery = useAdminFacilities()
  const createField = useCreateField()
  const updateField = useUpdateField()
  const uploadPhoto = useUploadFieldPhoto()
  const deletePhoto = useDeleteFieldPhoto()
  const setCoverPhoto = useSetCoverPhoto()
  const reorderPhotos = useReorderFieldPhotos()

  const [activeTab, setActiveTab] = useState('basic')
  const [draft, setDraft] = useState<FieldFormValues | null>(null)
  const [queuedFiles, setQueuedFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const serverValues: FieldFormValues | null = detailQuery.data
    ? {
         name: detailQuery.data.name,
         description: detailQuery.data.description,
         address: detailQuery.data.address,
         city: detailQuery.data.city,
         surface_type: detailQuery.data.surface_type,
        capacity: detailQuery.data.capacity,
        is_active: detailQuery.data.is_active,
        facility_ids: detailQuery.data.facilities.map((f) => f.id),
        prices:
          detailQuery.data.prices.length > 0
            ? detailQuery.data.prices.map((p) => ({
                day_type: p.day_type,
                start_time: p.start_time.slice(0, 5),
                end_time: p.end_time.slice(0, 5),
                price_per_slot: p.price_per_slot,
              }))
            : buildInitialValues().prices,
        operating_hours:
          detailQuery.data.operating_hours.length === 7
            ? detailQuery.data.operating_hours.map((h) => ({
                day_of_week: h.day_of_week,
                open_time: h.open_time.slice(0, 5),
                close_time: h.close_time.slice(0, 5),
                is_closed: h.is_closed,
              }))
            : defaultHours(),
      }
    : null

  const values = draft ?? (isEdit ? serverValues : buildInitialValues()) ?? buildInitialValues()

  const patchValues = (partial: Partial<FieldFormValues>) => {
    setDraft({ ...values, ...partial })
  }

  const toggleFacility = (facilityId: number) => {
    const exists = values.facility_ids.includes(facilityId)
    patchValues({
      facility_ids: exists
        ? values.facility_ids.filter((item) => item !== facilityId)
        : [...values.facility_ids, facilityId],
    })
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    if (isEdit && fieldId !== null) {
      files.forEach((file, idx) => {
        const isFirstCover = (detailQuery.data?.photos.length ?? 0) === 0 && idx === 0
        uploadPhoto.mutate({ fieldId, file, isCover: isFirstCover })
      })
    } else {
      setQueuedFiles((prev) => [...prev, ...files])
    }
    e.target.value = ''
  }

  const handleMovePhoto = (index: number, direction: -1 | 1) => {
    if (fieldId === null || !detailQuery.data) return
    const photos = [...detailQuery.data.photos]
    const targetIdx = index + direction
    if (targetIdx < 0 || targetIdx >= photos.length) return
    const [moved] = photos.splice(index, 1)
    photos.splice(targetIdx, 0, moved)
    reorderPhotos.mutate({ fieldId, photoIds: photos.map((p) => p.id) })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = fieldFormSchema.safeParse(values)
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0] ?? 'form')
        if (!nextErrors[key]) nextErrors[key] = issue.message
      })
      setErrors(nextErrors)
      if (nextErrors.prices) setActiveTab('prices')
      else if (nextErrors.operating_hours) setActiveTab('hours')
      else setActiveTab('basic')
      toast.error(parsed.error.issues[0]?.message ?? 'Periksa kembali input form lapangan.')
      return
    }
    setErrors({})

    const payload = {
       name: parsed.data.name,
       description: parsed.data.description,
       address: parsed.data.address,
       city: parsed.data.city,
       surface_type: parsed.data.surface_type,
      capacity: parsed.data.capacity,
      is_active: parsed.data.is_active,
      facility_ids: parsed.data.facility_ids,
      prices: parsed.data.prices,
      operating_hours: parsed.data.operating_hours,
    }

    if (isEdit && fieldId !== null) {
      updateField.mutate(
        { id: fieldId, payload },
        { onSuccess: () => onClose() },
      )
      return
    }

    createField.mutate(payload, {
      onSuccess: async (created) => {
        if (queuedFiles.length > 0) {
          await Promise.allSettled(
            queuedFiles.map((file, idx) =>
              uploadPhoto.mutateAsync({ fieldId: created.id, file, isCover: idx === 0 }),
            ),
          )
        }
        onClose()
      },
    })
  }

  if (isEdit && detailQuery.isLoading) {
    return <PageLoader label="Memuat data lapangan..." />
  }

  const isSaving = createField.isPending || updateField.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Tabs
        items={[
          { id: 'basic', label: 'Info Lapangan' },
          { id: 'facilities', label: 'Fasilitas' },
          { id: 'prices', label: 'Harga Slot' },
          { id: 'hours', label: 'Jam Operasional' },
          { id: 'photos', label: 'Foto' },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      <div className="max-h-[60vh] overflow-y-auto pr-1">
        {activeTab === 'basic' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-md border border-primary-200 bg-primary-50/70 p-3 text-xs text-primary-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" aria-hidden="true" />
              <p>
                Lapangan otomatis terdaftar di bawah manajemen <strong>Noel Futsal</strong> dengan
                akses pelaporan untuk Owner Noel Futsal.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nama Lapangan" htmlFor="modal-field-name" error={errors.name} required>
                <Input
                  id="modal-field-name"
                  value={values.name}
                  onChange={(e) => patchValues({ name: e.target.value })}
                  placeholder="Contoh: Lapangan A - Vinyl"
                  error={Boolean(errors.name)}
                />
              </FormField>

              <FormField
                label="Jenis Permukaan"
                htmlFor="modal-field-surface"
                error={errors.surface_type}
                required
              >
                <Select
                  id="modal-field-surface"
                  options={SURFACE_OPTIONS}
                  value={values.surface_type}
                  onChange={(e) => patchValues({ surface_type: e.target.value })}
                />
              </FormField>

              <FormField
                label="Kapasitas Pemain (Total)"
                htmlFor="modal-field-capacity"
                error={errors.capacity}
                hint="Contoh: 10 untuk format futsal 5v5"
                required
              >
                <Input
                  id="modal-field-capacity"
                  type="text"
                  inputMode="numeric"
                  placeholder="10"
                  value={values.capacity === 0 ? '' : String(values.capacity)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    patchValues({ capacity: digits === '' ? 0 : Number(digits) })
                  }}
                  error={Boolean(errors.capacity)}
                />
              </FormField>

              <FormField label="Status Lapangan" htmlFor="modal-field-active">
                <label
                  htmlFor="modal-field-active"
                  className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md border border-line bg-surface px-3 text-sm text-ink"
                >
                  <input
                    id="modal-field-active"
                    type="checkbox"
                    checked={values.is_active}
                    onChange={(e) => patchValues({ is_active: e.target.checked })}
                    className="h-4 w-4 accent-primary-900"
                  />
                  <span>Aktif dan dapat dipesan pelanggan</span>
                </label>
              </FormField>
            </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Alamat Venue" htmlFor="modal-field-address" error={errors.address} required>
                  <Input
                    id="modal-field-address"
                    value={values.address}
                    onChange={(e) => patchValues({ address: e.target.value })}
                    placeholder="Contoh: Jl. Stadion Utama No. 10"
                    error={Boolean(errors.address)}
                  />
                </FormField>
                <FormField label="Kota" htmlFor="modal-field-city" error={errors.city} required>
                  <Input
                    id="modal-field-city"
                    value={values.city}
                    onChange={(e) => patchValues({ city: e.target.value })}
                    placeholder="Contoh: Jakarta"
                    error={Boolean(errors.city)}
                  />
                </FormField>
              </div>

              <FormField label="Deskripsi Lapangan" htmlFor="modal-field-desc">
                <Textarea
                id="modal-field-desc"
                value={values.description}
                onChange={(e) => patchValues({ description: e.target.value })}
                rows={3}
                placeholder="Ceritakan keunggulan permukaan, ukuran standar, dan pencahayaan lapangan..."
              />
            </FormField>
          </div>
        )}

        {activeTab === 'facilities' && (
          <div className="space-y-3">
            <p className="text-sm text-fg-muted">
              Pilih fasilitas Noel Futsal yang tersedia untuk lapangan ini:
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {(facilitiesQuery.data ?? []).map((fac) => {
                const selected = values.facility_ids.includes(fac.id)
                return (
                  <button
                    key={fac.id}
                    type="button"
                    onClick={() => toggleFacility(fac.id)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition ${
                      selected
                        ? 'border-primary-800 bg-primary-50 font-semibold text-primary-950'
                        : 'border-line bg-surface text-fg-muted hover:border-line-strong'
                    }`}
                  >
                    <span>{fac.name}</span>
                    {selected && <Check className="h-4 w-4 text-primary-800" aria-hidden="true" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'prices' && (
          <PriceRuleEditor
            value={values.prices}
            onChange={(prices) => patchValues({ prices })}
            error={errors.prices}
          />
        )}

        {activeTab === 'hours' && (
          <OperatingHoursEditor
            value={values.operating_hours}
            onChange={(operating_hours) => patchValues({ operating_hours })}
            error={errors.operating_hours}
          />
        )}

        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-line-strong p-4">
              <div>
                <p className="text-sm font-semibold text-ink">Unggah Foto Lapangan</p>
                <p className="text-xs text-fg-muted">JPG atau PNG, maksimal 5MB per foto.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary-900 px-3 py-2 text-xs font-semibold text-surface hover:bg-primary-800">
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>Pilih File</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {!isEdit && queuedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-fg-muted">
                  {queuedFiles.length} foto siap diunggah setelah lapangan dibuat:
                </p>
                <ul className="space-y-1.5 text-xs">
                  {queuedFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between rounded border border-line px-3 py-2"
                    >
                      <span>
                        {file.name} {idx === 0 && <Badge size="sm">Sampul</Badge>}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setQueuedFiles((prev) => prev.filter((_, itemIdx) => itemIdx !== idx))
                        }
                      >
                        Hapus
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isEdit && detailQuery.data && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {detailQuery.data.photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-md border border-line bg-surface-alt"
                  >
                    <img
                      src={photo.url}
                      alt={`Foto lapangan ${idx + 1}`}
                      className="h-36 w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-1 p-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant={photo.is_cover ? 'primary' : 'secondary'}
                          onClick={() =>
                            fieldId !== null && setCoverPhoto.mutate({ fieldId, photoId: photo.id })
                          }
                          title="Jadikan sampul"
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={idx === 0}
                          onClick={() => handleMovePhoto(idx, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={idx === detailQuery.data.photos.length - 1}
                          onClick={() => handleMovePhoto(idx, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() =>
                          fieldId !== null && deletePhoto.mutate({ fieldId, photoId: photo.id })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 bg-surface-alt p-4" data-ui="form-controls">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
          Batal
        </Button>
        <Button type="submit" loading={isSaving}>
          {isEdit ? 'Simpan Perubahan' : 'Simpan Lapangan'}
        </Button>
      </div>
    </form>
  )
}
