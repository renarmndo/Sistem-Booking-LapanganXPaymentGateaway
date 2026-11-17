import { useState } from 'react'
import { AlertTriangle, Download } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, DataTable, SearchInput, type DataTableColumn } from '@/components/shared'
import { Badge, Button, Card, CardBody, Drawer, Input, Select } from '@/components/ui'
import { useDebounce } from '@/hooks/useDebounce'
import { adminOpsApi } from '../../api/adminOps.api'
import { useAdminTransactionDetail, useAdminTransactions } from '../../hooks/useAdminOps'
import type { AdminTransactionItem } from '../../types/adminOps.types'

export function AdminTransactionsPage() {
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const debouncedQ = useDebounce(search, 350)

  const txQuery = useAdminTransactions({
    q: debouncedQ || undefined,
    from: from || undefined,
    to: to || undefined,
    status: status || undefined,
    method: method || undefined,
    page,
    limit,
  })
  const [detailId, setDetailId] = useState<number | null>(null)
  const detailQuery = useAdminTransactionDetail(detailId)

  const items = txQuery.data?.items ?? []
  const summary = txQuery.data?.summary
  const detail = detailQuery.data

  const handleExport = async () => {
    const blob = await adminOpsApi.exportTransactionsCsv({
      q: debouncedQ || undefined,
      from: from || undefined,
      to: to || undefined,
      status: status || undefined,
      method: method || undefined,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'noel-futsal-transactions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const columns: DataTableColumn<AdminTransactionItem>[] = [
    {
      key: 'order_id',
      header: 'Order & Booking',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-bold text-ink">{row.order_id}</p>
          <p className="text-xs text-fg-muted">
            {row.booking_code} &middot; {row.field_name}
          </p>
        </div>
      ),
    },
    {
      key: 'method',
      header: 'Metode',
      render: (row) => (
        <span className="text-xs font-medium uppercase text-ink">
          {row.method} {row.channel ? `(${row.channel})` : ''}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Nominal',
      render: (row) => <CurrencyText value={row.amount} className="font-bold text-ink" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <Badge variant={row.status === 'paid' ? 'success' : 'neutral'} size="sm">
            {row.status}
          </Badge>
          {row.needs_review && (
            <AlertTriangle className="h-4 w-4 text-warning" aria-label="Perlu tinjauan manual" />
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end">
          <Button size="sm" variant="secondary" onClick={() => setDetailId(row.id)}>
            Detail
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Transaksi Pembayaran"
        subtitle="Pantau seluruh pembayaran Midtrans dan kasir tunai Noel Futsal."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.ADMIN_DASHBOARD },
          { label: 'Transaksi' },
        ]}
        actions={
          <Button size="sm" variant="secondary" onClick={() => void handleExport()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card>
            <CardBody className="py-3">
              <p className="text-xs text-fg-muted">Total Terbayar (Filter)</p>
              <CurrencyText value={summary.total_paid_amount} className="text-lg font-bold text-ink" />
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3">
              <p className="text-xs text-fg-muted">Jumlah Transaksi</p>
              <p className="text-lg font-bold text-ink">{summary.total_count}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="py-3">
              <p className="text-xs text-fg-muted">Perlu Tinjauan</p>
              <p className="text-lg font-bold text-warning">{summary.needs_review_count}</p>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-2 lg:grid-cols-5">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Cari order ID / kode..."
        />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Dari tanggal" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Sampai tanggal" />
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'Semua Status' },
            { value: 'paid', label: 'Paid' },
            { value: 'pending', label: 'Pending' },
            { value: 'partial', label: 'Partial' },
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'expired', label: 'Expired' },
          ]}
        />
        <Select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={[
            { value: '', label: 'Semua Metode' },
            { value: 'midtrans', label: 'Midtrans' },
            { value: 'cash', label: 'Tunai' },
            { value: 'transfer_manual', label: 'Transfer Manual' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
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
        emptyDescription="Transaksi pembayaran booking akan tampil di sini."
      />

      <Drawer
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `Detail Transaksi ${detail.order_id}` : 'Memuat Detail Transaksi...'}
        description="Rincian transaksi pembayaran dan log callback gateway."
        size="lg"
      >
        {detail && (
          <div className="space-y-5 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-alt p-3.5">
              <div>
                <p className="font-mono text-sm font-bold text-ink">{detail.order_id}</p>
                <p className="text-xs text-fg-muted">
                  Booking {detail.booking_code} &middot; {detail.field_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {detail.needs_review && <Badge variant="warning">Perlu Tinjauan</Badge>}
                <Badge variant={detail.status === 'paid' ? 'success' : 'neutral'}>
                  {detail.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-line p-3.5 text-xs sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-fg-muted">Nominal</span>
                  <CurrencyText value={detail.amount} className="font-bold text-ink" />
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Metode</span>
                  <span className="font-semibold uppercase text-ink">{detail.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Channel</span>
                  <span className="font-medium uppercase text-ink">{detail.channel || '-'}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-fg-muted">ID Transaksi Gateway</span>
                  <span className="font-mono text-ink">{detail.transaction_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Waktu Dibuat</span>
                  <span className="text-ink">{new Date(detail.created_at).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-fg-muted">Waktu Bayar</span>
                  <span className="text-ink">
                    {detail.paid_at ? new Date(detail.paid_at).toLocaleString('id-ID') : '-'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold tracking-wider text-fg-muted uppercase">
                Timeline Log Pembayaran ({detail.logs.length})
              </p>
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {detail.logs.length === 0 ? (
                  <p className="text-xs text-fg-muted">Belum ada catatan log pembayaran.</p>
                ) : (
                  detail.logs.map((l) => (
                    <div key={l.id} className="rounded-md border border-line bg-surface-alt p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-ink">{l.event}</span>
                        <span className="text-[11px] text-fg-muted">
                          {new Date(l.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <pre className="mt-1.5 overflow-x-auto rounded bg-surface p-2 text-[11px] text-fg-muted">
                        {l.raw_payload}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-line pt-3">
              <Button size="sm" variant="secondary" onClick={() => setDetailId(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default AdminTransactionsPage
