import { useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { AlertTriangle } from 'lucide-react'
import { Button, FormField, Input, Modal, Select, Textarea } from '@/components/ui'
import { useCreateScheduleBlock } from '../../hooks/useAdminOps'
import type { AdminFieldSummary } from '../../types/admin.types'
import type { ConflictingBookingInfo } from '../../types/adminOps.types'

export interface BlockScheduleDialogProps {
  open: boolean
  onClose: () => void
  fields: AdminFieldSummary[]
  defaultFieldId?: number
  defaultDate?: string
  defaultStartTime?: string
  defaultEndTime?: string
}

export function BlockScheduleDialog({
  open,
  onClose,
  fields,
  defaultFieldId,
  defaultDate,
  defaultStartTime = '08:00',
  defaultEndTime = '09:00',
}: BlockScheduleDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Blokir Jadwal Lapangan"
      description="Slot yang diblokir tidak dapat dipesan pelanggan online maupun offline."
      size="md"
    >
      {open ? (
        <BlockScheduleForm
          key={`${defaultFieldId ?? 0}-${defaultDate ?? ''}-${defaultStartTime}`}
          onClose={onClose}
          fields={fields}
          defaultFieldId={defaultFieldId ?? fields[0]?.id ?? 0}
          defaultDate={defaultDate ?? new Date().toISOString().slice(0, 10)}
          defaultStartTime={defaultStartTime}
          defaultEndTime={defaultEndTime}
        />
      ) : null}
    </Modal>
  )
}

function BlockScheduleForm({
  onClose,
  fields,
  defaultFieldId,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
}: {
  onClose: () => void
  fields: AdminFieldSummary[]
  defaultFieldId: number
  defaultDate: string
  defaultStartTime: string
  defaultEndTime: string
}) {
  const createBlock = useCreateScheduleBlock()
  const [fieldId, setFieldId] = useState(defaultFieldId)
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(defaultEndTime)
  const [reason, setReason] = useState('')
  const [conflicts, setConflicts] = useState<ConflictingBookingInfo[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setConflicts([])
    setErrorMsg(null)

    createBlock.mutate(
      {
        field_id: fieldId,
        start_datetime: `${date} ${startTime}`,
        end_datetime: `${date} ${endTime}`,
        reason,
      },
      {
        onSuccess: () => onClose(),
        onError: (err) => {
          if (isAxiosError(err) && err.response?.status === 409) {
            const data = err.response.data as {
              message?: string
              data?: { conflicting_bookings?: ConflictingBookingInfo[] }
            }
            setErrorMsg(data.message ?? 'Jadwal bentrok dengan booking aktif.')
            setConflicts(data.data?.conflicting_bookings ?? [])
            return
          }
          setErrorMsg('Gagal memblokir jadwal. Periksa kembali input Anda.')
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
          {conflicts.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {conflicts.map((c) => (
                <li key={c.id}>
                  <span className="font-mono font-semibold">{c.code}</span> ({c.status}) &middot;{' '}
                  {c.booking_date} {c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <FormField label="Lapangan" htmlFor="block-field" required>
        <Select
          id="block-field"
          value={String(fieldId)}
          onChange={(e) => setFieldId(Number(e.target.value))}
          options={fields.map((f) => ({ value: String(f.id), label: f.name }))}
        />
      </FormField>

      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="Tanggal" htmlFor="block-date" required>
          <Input
            id="block-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Jam Mulai" htmlFor="block-start" required>
          <Input
            id="block-start"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Jam Selesai" htmlFor="block-end" required>
          <Input
            id="block-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </FormField>
      </div>

      <FormField label="Alasan Pemblokiran" htmlFor="block-reason" required>
        <Textarea
          id="block-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          placeholder="Contoh: Perawatan rumput / Turnamen internal Noel Futsal"
          required
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" loading={createBlock.isPending}>
          Blokir Jadwal
        </Button>
      </div>
    </form>
  )
}
