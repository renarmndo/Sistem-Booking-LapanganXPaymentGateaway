import { useState } from 'react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, PageLoader, StatusBadge } from '@/components/shared'
import { Badge, Button, Card, CardBody, CardHeader, Drawer, Input, Select } from '@/components/ui'
import type { BookingStatusCode } from '@/constants/bookingStatus'
import { useOwnerFields, useOwnerSchedule } from '../hooks/useOwner'
import type { OwnerScheduleBooking } from '../types/owner.types'

function defaultWeekRange() {
  const from = new Date()
  const to = new Date()
  to.setDate(from.getDate() + 6)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export function OwnerSchedulePage() {
  const initial = defaultWeekRange()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [fieldId, setFieldId] = useState('')
  const [selected, setSelected] = useState<OwnerScheduleBooking | null>(null)

  const fieldsQuery = useOwnerFields()
  const scheduleQuery = useOwnerSchedule({
    field_id: fieldId ? Number(fieldId) : undefined,
    from,
    to,
  })

  if (scheduleQuery.isLoading) {
    return <PageLoader label="Memuat jadwal lapangan..." />
  }

  const bookings = scheduleQuery.data?.bookings ?? []
  const blocks = scheduleQuery.data?.blocks ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Lapangan (Read-Only)"
        subtitle="Pantau agenda reservasi dan pemblokiran perawatan di Noel Futsal."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.OWNER_DASHBOARD },
          { label: 'Jadwal' },
        ]}
      />

      <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-3">
        <Select
          value={fieldId}
          onChange={(e) => setFieldId(e.target.value)}
          options={[
            { value: '', label: 'Semua Lapangan' },
            ...(fieldsQuery.data ?? []).map((f) => ({ value: String(f.id), label: f.name })),
          ]}
        />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">Agenda Reservasi</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {bookings.length === 0 ? (
              <p className="text-xs text-fg-muted">Tidak ada reservasi pada rentang tanggal ini.</p>
            ) : (
              bookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelected(b)}
                  className="flex w-full items-center justify-between rounded-md border border-line px-3 py-2.5 text-left text-xs hover:bg-surface-alt"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {b.field_name} &middot; {b.booking_date} ({b.start_time}–{b.end_time})
                    </p>
                    <p className="text-fg-muted">
                      {b.code} &middot; {b.customer_name}
                    </p>
                  </div>
                  <StatusBadge status={b.status as BookingStatusCode} size="sm" />
                </button>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">Jadwal Diblokir</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {blocks.length === 0 ? (
              <p className="text-xs text-fg-muted">Tidak ada pemblokiran jadwal pada rentang ini.</p>
            ) : (
              blocks.map((blk) => (
                <div
                  key={blk.id}
                  className="rounded-md border border-danger/30 bg-danger/5 bg-[repeating-linear-gradient(-45deg,transparent,transparent_6px,rgba(220,38,38,0.06)_6px,rgba(220,38,38,0.06)_12px)] px-3 py-2.5 text-xs"
                >
                  <p className="font-semibold text-danger">{blk.reason}</p>
                  <p className="text-fg-muted">
                    {new Date(blk.start_datetime).toLocaleString('id-ID')} –{' '}
                    {new Date(blk.end_datetime).toLocaleString('id-ID')}
                  </p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Detail Reservasi ${selected.code}` : 'Detail Reservasi'}
        description="Informasi lengkap jadwal, pelanggan, dan status reservasi."
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
                  Pelanggan &amp; Biaya
                </p>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Nama Pelanggan</span>
                  <span className="font-semibold text-ink">{selected.customer_name || '-'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-fg-muted">Sumber Booking</span>
                  <span className="font-medium capitalize text-ink">{selected.source}</span>
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

export default OwnerSchedulePage
