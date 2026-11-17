import { useState } from 'react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, DataTable, SearchInput, StatusBadge, type DataTableColumn } from '@/components/shared'
import { Badge, Button, Drawer, Select } from '@/components/ui'
import type { BookingStatusCode } from '@/constants/bookingStatus'
import { useDebounce } from '@/hooks/useDebounce'
import { useOwnerBookings, useOwnerFields } from '../hooks/useOwner'
import type { OwnerBookingItem } from '../types/owner.types'

export function OwnerReservationsPage() {
  const [search, setSearch] = useState('')
  const [fieldId, setFieldId] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [selected, setSelected] = useState<OwnerBookingItem | null>(null)
  const debouncedQ = useDebounce(search, 350)

  const fieldsQuery = useOwnerFields()
  const bookingsQuery = useOwnerBookings({
    q: debouncedQ || undefined,
    field_id: fieldId ? Number(fieldId) : undefined,
    status: status || undefined,
    source: source || undefined,
    page,
    limit,
  })

  const items = bookingsQuery.data?.items ?? []

  const columns: DataTableColumn<OwnerBookingItem>[] = [
    {
      key: 'code',
      header: 'Kode & Pelanggan',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-bold text-ink">{row.code}</p>
          <p className="text-xs text-fg-muted">{row.customer_name}</p>
        </div>
      ),
    },
    {
      key: 'field',
      header: 'Lapangan & Jadwal',
      render: (row) => (
        <div className="text-xs">
          <p className="font-semibold text-ink">{row.field_name}</p>
          <p className="text-fg-muted">
            {row.booking_date} ({row.start_time}–{row.end_time})
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Nominal',
      render: (row) => <CurrencyText value={row.total_amount} className="font-bold text-ink" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status as BookingStatusCode} size="sm" />,
    },
    {
      key: 'detail',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => setSelected(row)}>
            Detail
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daftar Reservasi (Read-Only)"
        subtitle="Pantau seluruh reservasi online dan offline pada lapangan Noel Futsal."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.OWNER_DASHBOARD },
          { label: 'Reservasi' },
        ]}
      />

      <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Cari kode atau nama..."
        />
        <Select
          value={fieldId}
          onChange={(e) => {
            setFieldId(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Semua Lapangan' },
            ...(fieldsQuery.data ?? []).map((f) => ({ value: String(f.id), label: f.name })),
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
            { value: 'CONFIRMED', label: 'Terkonfirmasi' },
            { value: 'COMPLETED', label: 'Selesai' },
            { value: 'PENDING_PAYMENT', label: 'Menunggu Bayar' },
            { value: 'CANCELLED', label: 'Dibatalkan' },
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
        emptyTitle="Belum ada reservasi"
        emptyDescription="Reservasi pada lapangan milik Anda akan muncul di sini."
      />

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Detail Reservasi ${selected.code}` : 'Detail Reservasi'}
        description="Informasi lengkap jadwal, pelanggan, dan status pembayaran reservasi."
        size="lg"
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-muted/40 p-3.5">
              <div>
                <p className="text-xs text-fg-muted">Kode Reservasi</p>
                <p className="font-mono text-base font-bold text-ink">{selected.code}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selected.source === 'offline' ? 'gold' : 'neutral'}>
                  {selected.source === 'offline' ? 'Offline (Kasir)' : 'Online'}
                </Badge>
                <StatusBadge status={selected.status as BookingStatusCode} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-line p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Jadwal &amp; Lapangan
                </p>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Lapangan</span>
                  <span className="font-semibold text-ink">{selected.field_name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Tanggal Main</span>
                  <span className="font-medium text-ink">{selected.booking_date}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Jam</span>
                  <span className="font-medium text-ink">
                    {selected.start_time}–{selected.end_time}
                  </span>
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-line p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  Pelanggan &amp; Pembayaran
                </p>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Nama</span>
                  <span className="font-semibold text-ink">{selected.customer_name || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Telepon</span>
                  <span className="font-medium text-ink">{selected.customer_phone || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Metode &amp; Status</span>
                  <Badge variant={selected.payment_status === 'paid' ? 'success' : 'warning'} size="sm">
                    {selected.payment_method} &middot; {selected.payment_status}
                  </Badge>
                </div>
                <div className="flex justify-between gap-2 border-t border-line pt-2 font-bold">
                  <span className="text-ink">Total Tagihan</span>
                  <CurrencyText value={selected.total_amount} className="text-ink" />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-line pt-3">
              <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default OwnerReservationsPage
