import { useState } from 'react'
import { Download } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, DataTable, type DataTableColumn } from '@/components/shared'
import { Badge, Button, Card, CardBody, CardHeader, Input, Select, Skeleton } from '@/components/ui'
import { useOwnerFields, useOwnerRevenue, useOwnerTransactions } from '../hooks/useOwner'
import type { OwnerTransactionItem } from '../types/owner.types'

function defaultRange() {
  const to = new Date()
  const from = new Date()
  from.setDate(to.getDate() - 29)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export function OwnerRevenuePage() {
  const initial = defaultRange()
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)
  const [fieldId, setFieldId] = useState('')
  const [group, setGroup] = useState<'day' | 'month'>('day')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  const numericField = fieldId ? Number(fieldId) : undefined
  const fieldsQuery = useOwnerFields()
  const revenueQuery = useOwnerRevenue({ field_id: numericField, from, to, group })
  const txQuery = useOwnerTransactions({ field_id: numericField, from, to, page, limit })

  const rev = revenueQuery.data
  const txItems = txQuery.data?.items ?? []

  const exportCsv = () => {
    const header = ['Order ID', 'Booking', 'Lapangan', 'Metode', 'Nominal', 'Status']
    const rows = txItems.map((t) => [t.order_id, t.booking_code, t.field_name, t.method, String(t.amount), t.status])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `noel-futsal-owner-revenue-${from}-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns: DataTableColumn<OwnerTransactionItem>[] = [
    {
      key: 'order_id',
      header: 'Order & Booking',
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-bold text-ink">{r.order_id}</p>
          <p className="text-xs text-fg-muted">
            {r.booking_code} &middot; {r.field_name}
          </p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Metode',
      render: (r) => <span className="text-xs uppercase">{r.method}</span>,
    },
    {
      key: 'amount',
      header: 'Nominal',
      render: (r) => <CurrencyText value={r.amount} className="font-bold text-ink" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge variant={r.status === 'paid' ? 'success' : 'neutral'} size="sm">
          {r.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan Pendapatan"
        subtitle="Analisis pendapatan lunas online dan offline Noel Futsal."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.OWNER_DASHBOARD },
          { label: 'Pendapatan' },
        ]}
        actions={
          <Button size="sm" variant="secondary" disabled={txItems.length === 0} onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-4">
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
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select
          value={group}
          onChange={(e) => setGroup(e.target.value as 'day' | 'month')}
          options={[
            { value: 'day', label: 'Grup Harian' },
            { value: 'month', label: 'Grup Bulanan' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardBody className="py-3">
            <p className="text-xs text-fg-muted">Total Pendapatan</p>
            <CurrencyText value={rev?.total_revenue ?? 0} className="text-lg font-bold text-ink" />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-xs text-fg-muted">Online (Midtrans)</p>
            <CurrencyText value={rev?.online_revenue ?? 0} className="text-lg font-bold text-primary-900" />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-xs text-fg-muted">Offline (Kasir)</p>
            <CurrencyText value={rev?.offline_revenue ?? 0} className="text-lg font-bold text-gold-700" />
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-xs text-fg-muted">Pertumbuhan vs Periode Lalu</p>
            <p className="text-lg font-bold text-ink">
              {(rev?.revenue_growth_pct ?? 0) >= 0 ? '+' : ''}
              {rev?.revenue_growth_pct ?? 0}%
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-display text-base font-bold text-ink">
            Grafik Pendapatan ({group === 'month' ? 'Bulanan' : 'Harian'})
          </h2>
        </CardHeader>
        <CardBody>
          {revenueQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rev?.series ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                  />
                  <Tooltip formatter={(v) => `Rp ${Number(v ?? 0).toLocaleString('id-ID')}`} />
                  <Bar dataKey="online_revenue" name="Online" fill="#14532d" />
                  <Bar dataKey="offline_revenue" name="Offline" fill="#d97706" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <DataTable
        columns={columns}
        data={txItems}
        keyExtractor={(r) => r.id}
        loading={txQuery.isLoading}
        page={txQuery.data?.meta.page ?? 1}
        totalPages={txQuery.data?.meta.total_pages ?? 1}
        totalItems={txQuery.data?.meta.total}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
        }}
        emptyTitle="Belum ada transaksi"
        emptyDescription="Transaksi pada periode ini akan muncul di sini."
      />
    </div>
  )
}

export default OwnerRevenuePage
