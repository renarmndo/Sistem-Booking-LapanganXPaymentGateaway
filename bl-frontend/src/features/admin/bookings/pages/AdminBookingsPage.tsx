import { useState } from 'react'
import { CalendarPlus, Download } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import {
  CurrencyText,
  DataTable,
  SearchInput,
  StatusBadge,
  type DataTableColumn,
} from '@/components/shared'
import { Badge, Button, Drawer, Input, Modal, Select } from '@/components/ui'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/utils/formatDate'
import { useAdminFields } from '../../hooks/useAdminFields'
import { useAdminBookingDetail, useAdminBookings } from '../../hooks/useAdminOps'
import type { AdminBookingItem } from '../../types/adminOps.types'
import { AdminCancelBookingDialog } from '../components/AdminCancelBookingDialog'
import { CashPaymentDialog } from '../components/CashPaymentDialog'
import { OfflineBookingForm } from '../components/OfflineBookingForm'

function exportBookingsCsv(items: AdminBookingItem[]) {
  const header = [
    'Kode',
    'Tanggal',
    'Jam',
    'Lapangan',
    'Pelanggan',
    'HP',
    'Sumber',
    'Total',
    'Status',
    'Status Bayar',
  ]
  const rows = items.map((b) => [
    b.code,
    b.booking_date,
    `${b.start_time}-${b.end_time}`,
    b.field.name,
    b.customer_name || '-',
    b.customer_phone || '-',
    b.source,
    String(b.total_amount),
    b.status,
    b.payment.status,
  ])
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'noel-futsal-bookings.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function AdminBookingsPage() {
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const debouncedQ = useDebounce(search, 350)

  const fieldsQuery = useAdminFields({ limit: 50 })
  const bookingsQuery = useAdminBookings({
    q: debouncedQ || undefined,
    date: date || undefined,
    field_id: fieldId ? Number(fieldId) : undefined,
    status: status || undefined,
    source: source || undefined,
    page,
    limit,
  })

  const [detailId, setDetailId] = useState<number | null>(null)
  const detailQuery = useAdminBookingDetail(detailId)
  const [offlineModalOpen, setOfflineModalOpen] = useState(false)
  const [cashTarget, setCashTarget] = useState<AdminBookingItem | null>(null)
  const [cancelTarget, setCancelTarget] = useState<AdminBookingItem | null>(null)

  const items = bookingsQuery.data?.items ?? []
  const detail = detailQuery.data

  const columns: DataTableColumn<AdminBookingItem>[] = [
    {
      key: 'code',
      header: 'Kode & Pelanggan',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-bold text-ink">{row.code}</p>
          <p className="text-xs font-medium text-ink">{row.customer_name || 'Member'}</p>
          <p className="text-[11px] text-fg-muted">{row.customer_phone || '-'}</p>
        </div>
      ),
    },
    {
      key: 'schedule',
      header: 'Lapangan & Jadwal',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-ink">{row.field.name}</p>
          <p className="text-fg-muted">
            {formatDate(row.booking_date)} &middot; {row.start_time}–{row.end_time}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Tagihan & Bayar',
      render: (row) => (
        <div className="text-xs">
          <CurrencyText value={row.total_amount} className="font-bold text-ink" />
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge variant={row.payment.status === 'paid' ? 'success' : 'warning'} size="sm">
              {row.payment.status}
            </Badge>
            <Badge variant="neutral" size="sm">
              {row.source}
            </Badge>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setDetailId(row.id)}>
            Detail
          </Button>
          {row.status === 'CONFIRMED' && row.payment.status !== 'paid' && (
            <Button size="sm" onClick={() => setCashTarget(row)}>
              Bayar
            </Button>
          )}
          {(row.status === 'PENDING_PAYMENT' || row.status === 'CONFIRMED') && (
            <Button size="sm" variant="danger" onClick={() => setCancelTarget(row)}>
              Batalkan
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Daftar Booking Noel Futsal"
        subtitle="Kelola reservasi online maupun offline, pelunasan tunai, dan pembatalan."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.ADMIN_DASHBOARD },
          { label: 'Booking' },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={items.length === 0}
              onClick={() => exportBookingsCsv(items)}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>
            <Button size="sm" onClick={() => setOfflineModalOpen(true)}>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Booking Offline
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-5">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Cari kode, nama, atau HP..."
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            setPage(1)
          }}
          aria-label="Filter tanggal"
        />
        <Select
          value={fieldId}
          onChange={(e) => {
            setFieldId(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Semua Lapangan' },
            ...(fieldsQuery.data?.items ?? []).map((f) => ({
              value: String(f.id),
              label: f.name,
            })),
          ]}
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Semua Status' },
            { value: 'PENDING_PAYMENT', label: 'Menunggu Bayar' },
            { value: 'CONFIRMED', label: 'Terkonfirmasi' },
            { value: 'COMPLETED', label: 'Selesai' },
            { value: 'CANCELLED', label: 'Dibatalkan' },
            { value: 'EXPIRED', label: 'Kedaluwarsa' },
          ]}
        />
        <Select
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Semua Sumber' },
            { value: 'online', label: 'Online' },
            { value: 'offline', label: 'Offline' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(r) => r.id}
        loading={bookingsQuery.isLoading}
        page={bookingsQuery.data?.meta.page ?? 1}
        totalPages={bookingsQuery.data?.meta.total_pages ?? 1}
        totalItems={bookingsQuery.data?.meta.total}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
        }}
        emptyTitle="Tidak ada booking ditemukan"
        emptyDescription="Ubah filter pencarian untuk melihat data lainnya."
      />

      <Drawer
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `Detail Booking ${detail.code}` : 'Memuat Detail Booking...'}
        description="Informasi lengkap reservasi, pelanggan, slot jam, dan log aktivitas."
        size="lg"
      >
        {detail && (
          <div className="space-y-5 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-alt p-3.5">
              <div className="space-y-0.5">
                <p className="font-mono text-sm font-bold text-ink">{detail.code}</p>
                <p className="text-xs text-fg-muted">
                  Dibuat: {new Date(detail.created_at).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{detail.source.toUpperCase()}</Badge>
                <StatusBadge status={detail.status} size="sm" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-line p-3.5 text-xs">
                <p className="font-semibold tracking-wider text-fg-muted uppercase">
                  Informasi Lapangan &amp; Jadwal
                </p>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Lapangan</span>
                  <span className="font-semibold text-ink">{detail.field.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Permukaan</span>
                  <span className="text-ink">{detail.field.surface_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Tanggal Main</span>
                  <span className="font-semibold text-ink">{formatDate(detail.booking_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Jam Main</span>
                  <span className="font-mono font-semibold text-ink">
                    {detail.start_time} – {detail.end_time} WIB
                  </span>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-line p-3.5 text-xs">
                <p className="font-semibold tracking-wider text-fg-muted uppercase">
                  Informasi Pelanggan &amp; Bayar
                </p>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Nama</span>
                  <span className="font-semibold text-ink">{detail.customer_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Nomor HP</span>
                  <span className="font-mono text-ink">{detail.customer_phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Metode / Status</span>
                  <span className="font-semibold uppercase text-ink">
                    {detail.payment.provider} &middot; {detail.payment.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Terbayar / Total</span>
                  <span className="font-bold text-primary-900">
                    <CurrencyText value={detail.paid_amount} /> /{' '}
                    <CurrencyText value={detail.total_amount} />
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-line">
              <div className="bg-surface-alt px-3.5 py-2 text-xs font-semibold text-ink">
                Rincian Slot Jam ({detail.slots.length} jam)
              </div>
              <div className="divide-y divide-line">
                {detail.slots.map((sl) => (
                  <div
                    key={`${sl.start_time}-${sl.end_time}`}
                    className="flex items-center justify-between px-3.5 py-2 text-xs"
                  >
                    <span className="font-mono text-ink">
                      {sl.start_time} – {sl.end_time} WIB
                    </span>
                    <CurrencyText value={sl.price} className="font-semibold text-ink" />
                  </div>
                ))}
              </div>
            </div>

            {(detail.cancel_reason || detail.refund) && (
              <div className="space-y-1.5 rounded-lg border border-danger/30 bg-danger/5 p-3.5 text-xs">
                {detail.cancel_reason && (
                  <p className="text-ink">
                    <strong>Alasan Pembatalan:</strong> {detail.cancel_reason}
                  </p>
                )}
                {detail.refund && (
                  <p className="text-ink">
                    <strong>Refund:</strong> {detail.refund.status.toUpperCase()} &middot;{' '}
                    <CurrencyText value={detail.refund.amount} />
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-fg-muted uppercase">
                Timeline Aktivitas ({(detail.logs ?? []).length})
              </p>
              <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                {(detail.logs ?? []).map((l) => (
                  <div key={l.id} className="rounded-md border border-line bg-surface-alt px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">
                        {l.action} ({l.from_status || 'NEW'} &rarr; {l.to_status})
                      </span>
                      <span className="text-[11px] text-fg-muted">
                        {new Date(l.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {l.note && <p className="mt-0.5 text-fg-muted">{l.note}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
              {detail.status === 'CONFIRMED' && detail.payment.status !== 'paid' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailId(null)
                    setCashTarget(detail)
                  }}
                >
                  Catat Pembayaran
                </Button>
              )}
              {(detail.status === 'PENDING_PAYMENT' || detail.status === 'CONFIRMED') && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setDetailId(null)
                    setCancelTarget(detail)
                  }}
                >
                  Batalkan Booking
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setDetailId(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={offlineModalOpen}
        onClose={() => setOfflineModalOpen(false)}
        title="Buat Booking Offline Noel Futsal"
        description="Catat reservasi walk-in / telepon pelanggan secara real-time."
        size="xl"
        closeOnBackdrop={false}
      >
        {offlineModalOpen ? (
          <OfflineBookingForm onCompleted={() => setOfflineModalOpen(false)} />
        ) : null}
      </Modal>

      <CashPaymentDialog booking={cashTarget} onClose={() => setCashTarget(null)} />
      <AdminCancelBookingDialog booking={cancelTarget} onClose={() => setCancelTarget(null)} />
    </div>
  )
}

export default AdminBookingsPage
