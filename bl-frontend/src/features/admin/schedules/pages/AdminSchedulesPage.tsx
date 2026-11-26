import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { CalendarPlus, Lock, RefreshCw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { ConfirmDialog, CurrencyText, StatusBadge } from '@/components/shared'
import { Badge, Button, Card, CardBody, CardHeader, Drawer, Input, Modal, Select, Skeleton } from '@/components/ui'
import { fieldsApi } from '@/features/fields'
import type { SlotAvailability } from '@/features/booking'
import { useAdminFields } from '../../hooks/useAdminFields'
import { useAdminBookings, useDeleteScheduleBlock, useScheduleBlocks } from '../../hooks/useAdminOps'
import type { AdminBookingItem, ScheduleBlock } from '../../types/adminOps.types'
import { BlockScheduleDialog } from '../components/BlockScheduleDialog'

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function AdminSchedulesPage() {
  const navigate = useNavigate()
  const [date, setDate] = useState(() => formatLocalDate(new Date()))
  const [mobileFieldId, setMobileFieldId] = useState<number>(0)

  const fieldsQuery = useAdminFields({ is_active: true, limit: 20 })
  const fields = fieldsQuery.data?.items ?? []
  const activeMobileFieldId = mobileFieldId || fields[0]?.id || 0

  const availQueries = useQueries({
    queries: fields.map((f) => ({
      queryKey: ['fields', 'availability', f.id, date] as const,
      queryFn: () => fieldsApi.getAvailability(f.id, date),
      refetchInterval: 15_000,
    })),
  })

  const bookingsQuery = useAdminBookings({ date, limit: 100 })
  const blocksQuery = useScheduleBlocks({ from: `${date} 00:00`, to: `${date} 23:59`, limit: 50 })
  const deleteBlock = useDeleteScheduleBlock()

  const [actionCell, setActionCell] = useState<{ fieldId: number; fieldName: string; slot: SlotAvailability } | null>(null)
  const [blockModal, setBlockModal] = useState<{ fieldId?: number; start?: string; end?: string } | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingItem | null>(null)
  const [deleteBlockTarget, setDeleteBlockTarget] = useState<ScheduleBlock | null>(null)

  const allHours = Array.from(
    new Set(availQueries.flatMap((q) => (q.data ?? []).map((s) => s.start_time))),
  ).sort()

  const findBookingForSlot = (fieldId: number, startTime: string) =>
    (bookingsQuery.data?.items ?? []).find(
      (b) =>
        b.field.id === fieldId &&
        (b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') &&
        b.slots.some((sl) => sl.start_time === startTime),
    )

  const handleCellClick = (fieldId: number, fieldName: string, slot: SlotAvailability) => {
    if (slot.status === 'available') {
      setActionCell({ fieldId, fieldName, slot })
      return
    }
    if (slot.status === 'booked' || slot.status === 'locked') {
      const match = findBookingForSlot(fieldId, slot.start_time)
      if (match) setSelectedBooking(match)
    }
  }

  const slotBadgeStyle = (status: SlotAvailability['status']) => {
    switch (status) {
      case 'available':
        return 'border-primary-200 bg-primary-50/60 text-primary-900 hover:bg-primary-100 cursor-pointer'
      case 'booked':
        return 'border-ink/20 bg-primary-900 text-surface cursor-pointer'
      case 'locked':
        return 'border-gold-400 bg-gold-100 text-gold-900 cursor-pointer'
      case 'blocked':
        return 'border-danger/30 bg-danger/10 text-danger bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,rgba(220,38,38,0.08)_6px,rgba(220,38,38,0.08)_12px)]'
      default:
        return 'border-line bg-surface-alt text-fg-muted opacity-60'
    }
  }

  const mobileFieldIndex = fields.findIndex((f) => f.id === activeMobileFieldId)
  const mobileAvailQuery = mobileFieldIndex >= 0 ? availQueries[mobileFieldIndex] : undefined
  const mobileSlots = mobileAvailQuery?.data ?? []
  const isInitialGridLoading =
    fieldsQuery.isLoading ||
    (fields.length > 0 && allHours.length === 0 && availQueries.some((q) => q.isPending))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal & Blokir Slot"
        subtitle="Pantau okupansi real-time Noel Futsal, buat booking offline, atau blokir jam operasional."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.ADMIN_DASHBOARD },
          { label: 'Jadwal' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                availQueries.forEach((q) => void q.refetch())
                void bookingsQuery.refetch()
                void blocksQuery.refetch()
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Sinkronkan
            </Button>
            <Button size="sm" onClick={() => setBlockModal({})}>
              <Lock className="h-4 w-4" aria-hidden="true" />
              Blokir Jadwal
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <label htmlFor="sched-date" className="text-xs font-semibold text-ink">
            Tanggal:
          </label>
          <Input
            id="sched-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-medium">
          <span className="rounded border border-primary-200 bg-primary-50 px-2 py-0.5 text-primary-900">
            Tersedia
          </span>
          <span className="rounded bg-primary-900 px-2 py-0.5 text-surface">Terbooking</span>
          <span className="rounded border border-gold-400 bg-gold-100 px-2 py-0.5 text-gold-900">
            Dikunci (Pending)
          </span>
          <span className="rounded border border-danger/30 bg-danger/10 px-2 py-0.5 text-danger">
            Diblokir
          </span>
        </div>
      </div>

      {/* Mobile view: field selector + hourly list */}
      <div className="space-y-3 lg:hidden">
        <Select
          options={fields.map((f) => ({ value: String(f.id), label: f.name }))}
          value={String(activeMobileFieldId)}
          onChange={(e) => setMobileFieldId(Number(e.target.value))}
        />
        <div className="space-y-2">
          {mobileAvailQuery?.isPending ? (
            Array.from({ length: 6 }, (_, idx) => <Skeleton key={idx} className="h-10 w-full" />)
          ) : mobileSlots.length === 0 ? (
            <p className="rounded-md border border-line bg-surface p-4 text-center text-xs text-fg-muted">
              Tidak ada jam operasional pada tanggal ini.
            </p>
          ) : (
            mobileSlots.map((slot) => (
              <button
                key={slot.start_time}
                type="button"
                onClick={() =>
                  handleCellClick(
                    activeMobileFieldId,
                    fields[mobileFieldIndex]?.name ?? 'Lapangan',
                    slot,
                  )
                }
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-xs ${slotBadgeStyle(slot.status)}`}
              >
                <span className="font-mono font-semibold">
                  {slot.start_time} – {slot.end_time}
                </span>
                <span className="uppercase">{slot.status}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Desktop timeline grid */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface lg:block">
        {isInitialGridLoading ? (
          <div className="p-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : fields.length === 0 ? (
          <p className="p-6 text-center text-sm text-fg-muted">Belum ada lapangan aktif.</p>
        ) : allHours.length === 0 ? (
          <p className="p-6 text-center text-sm text-fg-muted">
            Tidak ada jam operasional tersedia pada tanggal {date}.
          </p>
        ) : (
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-line bg-surface-alt">
                <th className="w-28 px-3 py-3 text-left font-semibold text-fg-muted">Jam</th>
                {fields.map((f) => (
                  <th key={f.id} className="px-3 py-3 text-left font-semibold text-ink">
                    {f.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allHours.map((hour) => (
                <tr key={hour} className="border-b border-line last:border-b-0">
                  <td className="px-3 py-2 font-mono font-semibold text-fg-muted">{hour}</td>
                  {fields.map((f, idx) => {
                    const fieldQuery = availQueries[idx]
                    if (fieldQuery?.isPending) {
                      return (
                        <td key={f.id} className="px-2 py-1.5">
                          <Skeleton className="h-9 w-full rounded" />
                        </td>
                      )
                    }
                    if (fieldQuery?.isError) {
                      return (
                        <td key={f.id} className="px-2 py-1.5 text-[11px] text-danger">
                          Gagal memuat
                        </td>
                      )
                    }
                    const slot = (fieldQuery?.data ?? []).find((s) => s.start_time === hour)
                    if (!slot) {
                      return (
                        <td key={f.id} className="px-2 py-1.5 text-fg-muted">
                          —
                        </td>
                      )
                    }
                    const booking = findBookingForSlot(f.id, slot.start_time)
                    return (
                      <td key={f.id} className="px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => handleCellClick(f.id, f.name, slot)}
                          className={`flex w-full items-center justify-between rounded border px-2.5 py-2 text-left transition ${slotBadgeStyle(slot.status)}`}
                        >
                          <span className="truncate font-medium">
                            {booking
                              ? booking.customer_name || booking.code
                              : slot.status === 'available'
                                ? 'Kosong'
                                : slot.status}
                          </span>
                          <span className="font-mono text-[10px] opacity-80">
                            {slot.start_time}
                          </span>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Active schedule blocks list */}
      <Card>
        <CardHeader>
          <h2 className="font-display text-base font-bold text-ink">
            Daftar Blokir Jadwal ({date})
          </h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {(blocksQuery.data?.items ?? []).length === 0 ? (
            <p className="text-xs text-fg-muted">Tidak ada blokir jadwal pada tanggal ini.</p>
          ) : (
            blocksQuery.data?.items.map((blk) => {
              const fieldName = fields.find((f) => f.id === blk.field_id)?.name ?? `Lapangan #${blk.field_id}`
              return (
                <div
                  key={blk.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-ink">{fieldName}</p>
                    <p className="text-fg-muted">
                      {new Date(blk.start_datetime).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      –{' '}
                      {new Date(blk.end_datetime).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      &middot; {blk.reason}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleteBlockTarget(blk)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              )
            })
          )}
        </CardBody>
      </Card>

      {/* Cell action modal */}
      <Modal
        open={actionCell !== null}
        onClose={() => setActionCell(null)}
        title="Pilih Aksi Slot"
        description={
          actionCell
            ? `${actionCell.fieldName} · ${date} (${actionCell.slot.start_time}–${actionCell.slot.end_time})`
            : ''
        }
        size="sm"
      >
        <div className="grid gap-2.5">
          <Button
            onClick={() => {
              if (!actionCell) return
              navigate(
                `${PATHS.ADMIN_OFFLINE_BOOKING}?field_id=${actionCell.fieldId}&date=${date}&start=${actionCell.slot.start_time}`,
              )
              setActionCell(null)
            }}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Buat Booking Offline
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (!actionCell) return
              setBlockModal({
                fieldId: actionCell.fieldId,
                start: actionCell.slot.start_time,
                end: actionCell.slot.end_time,
              })
              setActionCell(null)
            }}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Blokir Slot Ini
          </Button>
        </div>
      </Modal>

      <BlockScheduleDialog
        open={blockModal !== null}
        onClose={() => setBlockModal(null)}
        fields={fields}
        defaultFieldId={blockModal?.fieldId}
        defaultDate={date}
        defaultStartTime={blockModal?.start}
        defaultEndTime={blockModal?.end}
      />

      <Drawer
        open={selectedBooking !== null}
        onClose={() => setSelectedBooking(null)}
        title={selectedBooking ? `Detail Booking ${selectedBooking.code}` : 'Detail Booking'}
        description="Informasi lengkap reservasi, pelanggan, dan rincian slot jadwal."
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-muted/40 p-3.5">
              <div>
                <p className="text-xs text-fg-muted">Kode Booking</p>
                <p className="font-mono text-base font-bold text-ink">{selectedBooking.code}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selectedBooking.source === 'offline' ? 'gold' : 'neutral'}>
                  {selectedBooking.source === 'offline' ? 'Offline (Kasir)' : 'Online'}
                </Badge>
                <StatusBadge status={selectedBooking.status} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-line p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Jadwal &amp; Lapangan
                </p>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Lapangan</span>
                  <span className="font-semibold text-ink">{selectedBooking.field.name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Tanggal Main</span>
                  <span className="font-medium text-ink">{selectedBooking.booking_date}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Jam</span>
                  <span className="font-medium text-ink">
                    {selectedBooking.start_time}–{selectedBooking.end_time} ({selectedBooking.slots.length} jam)
                  </span>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-line p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Pelanggan &amp; Pembayaran
                </p>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Nama</span>
                  <span className="font-semibold text-ink">{selectedBooking.customer_name || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Telepon</span>
                  <span className="font-medium text-ink">{selectedBooking.customer_phone || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Status Bayar</span>
                  <Badge variant={selectedBooking.payment.status === 'paid' ? 'success' : 'warning'} size="sm">
                    {selectedBooking.payment.provider} &middot; {selectedBooking.payment.status}
                  </Badge>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Dibayar</span>
                  <CurrencyText value={selectedBooking.paid_amount} className="font-medium text-ink" />
                </div>
                <div className="flex justify-between gap-2 border-t border-line pt-2 font-bold">
                  <span className="text-ink">Total Tagihan</span>
                  <CurrencyText value={selectedBooking.total_amount} className="text-ink" />
                </div>
              </div>
            </div>

            {selectedBooking.slots && selectedBooking.slots.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Rincian Slot ({selectedBooking.slots.length} jam)
                </p>
                <div className="divide-y divide-line rounded-lg border border-line">
                  {selectedBooking.slots.map((slot, idx) => (
                    <div key={`${slot.start_time}-${idx}`} className="flex items-center justify-between px-3.5 py-2 text-xs">
                      <span className="font-medium text-ink">
                        {slot.start_time} – {slot.end_time}
                      </span>
                      <CurrencyText value={slot.price} className="font-semibold text-ink" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-line pt-3">
              <Button variant="secondary" size="sm" onClick={() => setSelectedBooking(null)}>
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedBooking(null)
                  navigate(`${PATHS.ADMIN_BOOKINGS}?q=${encodeURIComponent(selectedBooking.code)}`)
                }}
              >
                Kelola di Daftar Booking
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={deleteBlockTarget !== null}
        onClose={() => setDeleteBlockTarget(null)}
        onConfirm={() => {
          if (deleteBlockTarget) {
            deleteBlock.mutate(deleteBlockTarget.id, {
              onSuccess: () => setDeleteBlockTarget(null),
            })
          }
        }}
        title="Hapus Blokir Jadwal?"
        description="Slot pada rentang waktu ini akan kembali tersedia untuk dipesan."
        variant="danger"
        loading={deleteBlock.isPending}
      />
    </div>
  )
}

export default AdminSchedulesPage
