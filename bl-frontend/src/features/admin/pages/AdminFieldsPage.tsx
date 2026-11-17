import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { ConfirmDialog, CurrencyText, DataTable, SearchInput, type DataTableColumn } from '@/components/shared'
import { Badge, Button } from '@/components/ui'
import { useDebounce } from '@/hooks/useDebounce'
import { AdminFieldFormModal } from '../components/AdminFieldFormModal'
import { useAdminFields, useDeleteField, useUpdateFieldStatus } from '../hooks/useAdminFields'
import type { AdminFieldSummary } from '../types/admin.types'

export function AdminFieldsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const debouncedSearch = useDebounce(search, 350)

  const fieldsQuery = useAdminFields({ q: debouncedSearch || undefined, page, limit })
  const deleteField = useDeleteField()
  const updateStatus = useUpdateFieldStatus()

  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null)
  const [statusTarget, setStatusTarget] = useState<AdminFieldSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminFieldSummary | null>(null)

  const openCreateModal = () => {
    setEditingFieldId(null)
    setFormModalOpen(true)
  }

  const openEditModal = (fieldId: number) => {
    setEditingFieldId(fieldId)
    setFormModalOpen(true)
  }

  const handleToggleStatus = (field: AdminFieldSummary) => {
    if (field.is_active) {
      setStatusTarget(field)
    } else {
      updateStatus.mutate({ id: field.id, isActive: true })
    }
  }

  const columns: DataTableColumn<AdminFieldSummary>[] = [
    {
      key: 'name',
      header: 'Lapangan',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.name}</p>
          <p className="text-xs text-fg-muted">
            {row.surface_type} &middot; {row.capacity} pemain
          </p>
        </div>
      ),
    },
    {
      key: 'min_price',
      header: 'Tarif Mulai',
      render: (row) => <CurrencyText value={row.min_price} suffix="/jam" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'neutral'} size="sm">
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openEditModal(row.id)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={row.is_active ? 'secondary' : 'primary'}
            onClick={() => handleToggleStatus(row)}
          >
            {row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manajemen Lapangan Noel Futsal"
        subtitle="Kelola daftar lapangan, foto, fasilitas, harga, dan jam operasional."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.ADMIN_DASHBOARD },
          { label: 'Lapangan' },
        ]}
        actions={
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Lapangan
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={(val) => {
          setSearch(val)
          setPage(1)
        }}
        placeholder="Cari lapangan..."
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={fieldsQuery.data?.items ?? []}
        keyExtractor={(row) => row.id}
        loading={fieldsQuery.isLoading}
        page={fieldsQuery.data?.meta.page ?? 1}
        totalPages={fieldsQuery.data?.meta.total_pages ?? 1}
        totalItems={fieldsQuery.data?.meta.total}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
        }}
        emptyTitle="Belum ada lapangan"
        emptyDescription="Tambahkan lapangan pertama untuk mulai menerima pemesanan."
      />

      <ConfirmDialog
        open={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => {
          if (statusTarget) {
            updateStatus.mutate(
              { id: statusTarget.id, isActive: false },
              { onSuccess: () => setStatusTarget(null) },
            )
          }
        }}
        title="Nonaktifkan Lapangan?"
        description={`Lapangan "${statusTarget?.name ?? ''}" tidak akan tampil di katalog publik.`}
        variant="danger"
        loading={updateStatus.isPending}
      />

      <AdminFieldFormModal
        open={formModalOpen}
        fieldId={editingFieldId}
        onClose={() => setFormModalOpen(false)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteField.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
        title="Hapus Lapangan?"
        description={`Lapangan "${deleteTarget?.name ?? ''}" akan dihapus permanen.`}
        variant="danger"
        loading={deleteField.isPending}
      />
    </div>
  )
}

export default AdminFieldsPage
