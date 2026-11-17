import { useState } from 'react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { ConfirmDialog, CurrencyText, DataTable, type DataTableColumn } from '@/components/shared'
import { Badge, Button, FormField, Select, Textarea } from '@/components/ui'
import { useAdminRefunds, useProcessAdminRefund } from '../../hooks/useAdminOps'
import type { AdminRefundItem } from '../../types/adminOps.types'

export function AdminRefundsPage() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const refundsQuery = useAdminRefunds({ status: status || undefined, page, limit })
  const processRefund = useProcessAdminRefund()

  const [decisionTarget, setDecisionTarget] = useState<{
    item: AdminRefundItem
    action: 'process' | 'reject'
  } | null>(null)
  const [note, setNote] = useState('')

  const items = refundsQuery.data?.items ?? []

  const columns: DataTableColumn<AdminRefundItem>[] = [
    {
      key: 'booking_code',
      header: 'Booking',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-bold text-ink">{row.booking_code}</p>
          <p className="text-xs text-fg-muted">{row.reason || '-'}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Nominal Refund',
      render: (row) => <CurrencyText value={row.amount} className="font-bold text-ink" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'processed'
              ? 'success'
              : row.status === 'rejected'
                ? 'danger'
                : 'warning'
          }
          size="sm"
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) =>
        row.status === 'pending' ? (
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              onClick={() => {
                setNote('')
                setDecisionTarget({ item: row, action: 'process' })
              }}
            >
              Proses
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setNote('')
                setDecisionTarget({ item: row, action: 'reject' })
              }}
            >
              Tolak
            </Button>
          </div>
        ) : (
          <span className="text-xs text-fg-muted">{row.note || 'Selesai'}</span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permintaan Refund"
        subtitle="Kelola antrian pengembalian dana pelanggan Noel Futsal."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.ADMIN_DASHBOARD },
          { label: 'Refund' },
        ]}
        actions={
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            options={[
              { value: '', label: 'Semua Status' },
              { value: 'pending', label: 'Menunggu' },
              { value: 'processed', label: 'Diproses' },
              { value: 'rejected', label: 'Ditolak' },
            ]}
          />
        }
      />

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(r) => r.id}
        loading={refundsQuery.isLoading}
        page={refundsQuery.data?.meta.page ?? 1}
        totalPages={refundsQuery.data?.meta.total_pages ?? 1}
        totalItems={refundsQuery.data?.meta.total}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
        }}
        emptyTitle="Tidak ada permintaan refund"
        emptyDescription="Permintaan refund dari pembatalan booking akan muncul di sini."
      />

      <ConfirmDialog
        open={decisionTarget !== null}
        onClose={() => setDecisionTarget(null)}
        onConfirm={() => {
          if (!decisionTarget) return
          processRefund.mutate(
            { id: decisionTarget.item.id, action: decisionTarget.action, note },
            { onSuccess: () => setDecisionTarget(null) },
          )
        }}
        title={
          decisionTarget?.action === 'process' ? 'Proses Refund?' : 'Tolak Permintaan Refund?'
        }
        description={`Booking ${decisionTarget?.item.booking_code ?? ''} sebesar Rp ${(decisionTarget?.item.amount ?? 0).toLocaleString('id-ID')}.`}
        variant={decisionTarget?.action === 'reject' ? 'danger' : 'primary'}
        loading={processRefund.isPending}
      />

      {decisionTarget && (
        <div className="hidden">
          <FormField label="Catatan" htmlFor="ref-note">
            <Textarea id="ref-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
      )}
    </div>
  )
}

export default AdminRefundsPage
