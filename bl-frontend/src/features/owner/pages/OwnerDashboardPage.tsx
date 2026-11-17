import { useState } from 'react'
import { Activity, Banknote, CalendarCheck2, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/layout'
import { CurrencyText, StatusBadge } from '@/components/shared'
import { Card, CardBody, CardHeader, Input, Select, Skeleton } from '@/components/ui'
import type { BookingStatusCode } from '@/constants/bookingStatus'
import { useOwnerDashboardSummary, useOwnerFields, useOwnerRevenue } from '../hooks/useOwner'

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 29)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export function OwnerDashboardPage() {
  const initial = defaultRange()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [fieldId, setFieldId] = useState<string>('')

  const numericFieldId = fieldId ? Number(fieldId) : undefined
  const fieldsQuery = useOwnerFields()
  const summaryQuery = useOwnerDashboardSummary({ field_id: numericFieldId, from, to })
  const revenueQuery = useOwnerRevenue({ field_id: numericFieldId, from, to, group: 'day' })

  const summary = summaryQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Owner Noel Futsal"
        subtitle="Pantau kinerja pendapatan, utilisasi lapangan, dan reservasi mendatang secara real-time."
      />

      <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-3">
        <Select
          value={fieldId}
          onChange={(e) => setFieldId(e.target.value)}
          options={[
            { value: '', label: 'Semua Lapangan Milik Saya' },
            ...(fieldsQuery.data ?? []).map((f) => ({ value: String(f.id), label: f.name })),
          ]}
          aria-label="Filter lapangan"
        />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" />
      </div>

      {summaryQuery.isLoading || !summary ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <CardBody className="space-y-1">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Pendapatan (Lunas)</span>
                <Banknote className="h-4 w-4 text-primary-700" aria-hidden="true" />
              </div>
              <CurrencyText value={summary.total_revenue} className="text-lg font-bold text-ink sm:text-2xl" />
              <p className="text-[11px] text-fg-muted">
                Periode lalu: <CurrencyText value={summary.previous_revenue} />
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-1">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Pertumbuhan</span>
                <TrendingUp className="h-4 w-4 text-primary-700" aria-hidden="true" />
              </div>
              <p className="text-lg font-bold text-ink sm:text-2xl">
                {summary.revenue_growth_pct >= 0 ? '+' : ''}
                {summary.revenue_growth_pct}%
              </p>
              <p className="text-[11px] text-fg-muted">Dibanding periode sebelumnya</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-1">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Total Booking Lunas</span>
                <CalendarCheck2 className="h-4 w-4 text-primary-700" aria-hidden="true" />
              </div>
              <p className="text-lg font-bold text-ink sm:text-2xl">{summary.total_bookings}</p>
              <p className="text-[11px] text-fg-muted">
                {summary.from} s/d {summary.to}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-1">
              <div className="flex items-center justify-between text-xs text-fg-muted">
                <span>Rata-rata Utilisasi</span>
                <Activity className="h-4 w-4 text-gold-600" aria-hidden="true" />
              </div>
              <p className="text-lg font-bold text-ink sm:text-2xl">{summary.average_utilization}%</p>
              <p className="text-[11px] text-fg-muted">Jam terpakai vs tersedia</p>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">
              Grafik Pendapatan (Online vs Offline)
            </h2>
          </CardHeader>
          <CardBody>
            {revenueQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (revenueQuery.data?.series ?? []).length === 0 ? (
              <p className="py-16 text-center text-sm text-fg-muted">
                Belum ada pendapatan tercatat pada periode ini.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueQuery.data?.series ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                    />
                    <Tooltip
                      formatter={(value) => `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`}
                    />
                    <Bar dataKey="online_revenue" name="Online" stackId="a" fill="#14532d" />
                    <Bar dataKey="offline_revenue" name="Offline" stackId="a" fill="#d97706" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">Utilisasi per Lapangan</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {(summary?.field_utilizations ?? []).map((fu) => (
              <div key={fu.field_id} className="space-y-1 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-ink">{fu.field_name}</span>
                  <span className="font-bold text-primary-900">{fu.utilization_percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full bg-primary-700"
                    style={{ width: `${Math.min(100, fu.utilization_percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-base font-bold text-ink">Reservasi Mendatang (7 Hari)</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {(summary?.upcoming_bookings ?? []).length === 0 ? (
            <p className="text-xs text-fg-muted">Belum ada jadwal reservasi mendatang.</p>
          ) : (
            summary?.upcoming_bookings.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-ink">{b.code}</span>
                  <span className="mx-1.5 text-fg-muted">&middot;</span>
                  <span className="font-medium text-ink">{b.field_name}</span>
                  <p className="text-fg-muted">
                    {b.booking_date} ({b.start_time}–{b.end_time}) &middot; {b.customer_name}
                  </p>
                </div>
                <StatusBadge status={b.status as BookingStatusCode} size="sm" />
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  )
}

export default OwnerDashboardPage
