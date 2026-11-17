import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { ConfirmDialog, DataTable, type DataTableColumn } from '@/components/shared'
import { Button, FormField, Input, Modal } from '@/components/ui'
import {
  useAdminFacilities,
  useCreateFacility,
  useDeleteFacility,
  useUpdateFacility,
} from '../hooks/useAdminFields'
import { facilityFormSchema } from '../schemas/field.schema'
import type { AdminFacility } from '../types/admin.types'

export function AdminFacilitiesPage() {
  const facilitiesQuery = useAdminFacilities()
  const createFacility = useCreateFacility()
  const updateFacility = useUpdateFacility()
  const deleteFacility = useDeleteFacility()

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminFacility | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('check')
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminFacility | null>(null)

  const openCreate = () => {
    setEditing(null)
    setName('')
    setIcon('check')
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (facility: AdminFacility) => {
    setEditing(facility)
    setName(facility.name)
    setIcon(facility.icon)
    setError(null)
    setModalOpen(true)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = facilityFormSchema.safeParse({ name, icon })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Data tidak valid')
      return
    }
    setError(null)

    if (editing) {
      updateFacility.mutate(
        { id: editing.id, payload: parsed.data },
        { onSuccess: () => setModalOpen(false) },
      )
    } else {
      createFacility.mutate(parsed.data, { onSuccess: () => setModalOpen(false) })
    }
  }

  const columns: DataTableColumn<AdminFacility>[] = [
    {
      key: 'name',
      header: 'Nama Fasilitas',
      render: (row) => <span className="font-semibold text-ink">{row.name}</span>,
    },
    {
      key: 'icon',
      header: 'Kode Ikon',
      render: (row) => <span className="font-mono text-xs text-fg-muted">{row.icon}</span>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
            Edit
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
        title="Master Fasilitas"
        subtitle="Kelola daftar fasilitas yang dapat dipasang pada setiap lapangan."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.ADMIN_DASHBOARD },
          { label: 'Fasilitas' },
        ]}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Fasilitas
          </Button>
        }
      />

      {(() => {
        const allItems = facilitiesQuery.data ?? []
        const totalItems = allItems.length
        const totalPages = Math.max(1, Math.ceil(totalItems / limit))
        const safePage = Math.min(page, totalPages)
        const pagedItems = allItems.slice((safePage - 1) * limit, safePage * limit)
        return (
          <DataTable
            columns={columns}
            data={pagedItems}
            keyExtractor={(row) => row.id}
            loading={facilitiesQuery.isLoading}
            page={safePage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setPage}
            limit={limit}
            onLimitChange={(next) => {
              setLimit(next)
              setPage(1)
            }}
            emptyTitle="Belum ada fasilitas"
            emptyDescription="Tambahkan fasilitas seperti Parkir, Toilet, atau Musholla."
          />
        )
      })()}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Fasilitas' : 'Tambah Fasilitas'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <FormField label="Nama Fasilitas" htmlFor="fac-name" required>
            <Input
              id="fac-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Ruang Ganti"
              required
            />
          </FormField>
          <FormField label="Nama Ikon (Lucide)" htmlFor="fac-icon" required>
            <Input
              id="fac-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Contoh: shirt"
              required
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              loading={createFacility.isPending || updateFacility.isPending}
            >
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteFacility.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
          }
        }}
        title="Hapus Fasilitas?"
        description={`Fasilitas "${deleteTarget?.name ?? ''}" akan dihapus dari master data.`}
        variant="danger"
        loading={deleteFacility.isPending}
      />
    </div>
  )
}

export default AdminFacilitiesPage
