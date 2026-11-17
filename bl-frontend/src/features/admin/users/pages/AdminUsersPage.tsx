import { useState, type FormEvent } from 'react'
import { KeyRound, Plus } from 'lucide-react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import {
  ConfirmDialog,
  CurrencyText,
  DataTable,
  SearchInput,
  type DataTableColumn,
} from '@/components/shared'
import { Badge, Button, Drawer, FormField, Input, Modal, Select } from '@/components/ui'
import { useAuthStore } from '@/features/auth'
import { useDebounce } from '@/hooks/useDebounce'
import {
  useAdminUserDetail,
  useAdminUsers,
  useCreateAdminUser,
  useResetAdminUserPassword,
  useUpdateAdminUser,
} from '../../hooks/useAdminOps'
import type { AdminUserItem } from '../../types/adminOps.types'

export function AdminUsersPage() {
  const currentUser = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [isActive, setIsActive] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const debouncedQ = useDebounce(search, 350)

  const usersQuery = useAdminUsers({
    q: debouncedQ || undefined,
    role: role || undefined,
    is_active: isActive || undefined,
    page,
    limit,
  })
  const createUser = useCreateAdminUser()
  const updateUser = useUpdateAdminUser()
  const resetPassword = useResetAdminUserPassword()

  const [detailId, setDetailId] = useState<number | null>(null)
  const detailQuery = useAdminUserDetail(detailId)

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'owner'>('admin')

  const [toggleTarget, setToggleTarget] = useState<AdminUserItem | null>(null)
  const [resetTarget, setResetTarget] = useState<AdminUserItem | null>(null)
  const [resetPwd, setResetPwd] = useState('')

  const items = usersQuery.data?.items ?? []
  const detail = detailQuery.data

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault()
    createUser.mutate(
      { name: newName, email: newEmail, phone: newPhone, password: newPassword, role: newRole },
      {
        onSuccess: () => {
          setCreateOpen(false)
          setNewName('')
          setNewEmail('')
          setNewPhone('')
          setNewPassword('')
        },
      },
    )
  }

  const handleResetSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!resetTarget) return
    resetPassword.mutate(
      { id: resetTarget.id, newPassword: resetPwd },
      {
        onSuccess: () => {
          setResetTarget(null)
          setResetPwd('')
        },
      },
    )
  }

  const roleBadgeLabel = (r: AdminUserItem['role']) =>
    r === 'admin' ? 'Petugas Noel' : r === 'owner' ? 'Owner Noel' : 'Pelanggan'

  const columns: DataTableColumn<AdminUserItem>[] = [
    {
      key: 'name',
      header: 'Pengguna',
      render: (row) => (
        <div>
          <p className="font-semibold text-ink">{row.name}</p>
          <p className="text-xs text-fg-muted">
            {row.email} &middot; {row.phone}
          </p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Peran',
      render: (row) => (
        <Badge variant="neutral" size="sm">
          {roleBadgeLabel(row.role)}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'danger'} size="sm">
          {row.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (row) => {
        const isSelf = currentUser?.id === row.id
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setDetailId(row.id)}>
              Detail
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setResetTarget(row)}
              title="Reset Password"
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <Button
              size="sm"
              variant={row.is_active ? 'danger' : 'primary'}
              disabled={isSelf && row.is_active}
              onClick={() => setToggleTarget(row)}
            >
              {row.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Pelanggan & Akun Noel Futsal"
        subtitle="Kelola pelanggan, petugas admin, serta akun owner Noel Futsal."
        breadcrumbs={[
          { label: 'Dashboard', to: PATHS.ADMIN_DASHBOARD },
          { label: 'Pelanggan' },
        ]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Buat Akun
          </Button>
        }
      />

      <div className="grid gap-3 rounded-lg border border-line bg-surface p-3 sm:grid-cols-3">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Cari nama, email, atau HP..."
        />
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Semua Peran' },
            { value: 'user', label: 'Pelanggan' },
            { value: 'admin', label: 'Petugas Admin' },
            { value: 'owner', label: 'Owner Noel Futsal' },
          ]}
        />
        <Select
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value)
            setPage(1)
          }}
          options={[
            { value: '', label: 'Semua Status' },
            { value: 'true', label: 'Aktif' },
            { value: 'false', label: 'Nonaktif' },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(r) => r.id}
        loading={usersQuery.isLoading}
        page={usersQuery.data?.meta.page ?? 1}
        totalPages={usersQuery.data?.meta.total_pages ?? 1}
        totalItems={usersQuery.data?.meta.total}
        onPageChange={setPage}
        limit={limit}
        onLimitChange={(next) => {
          setLimit(next)
          setPage(1)
        }}
        emptyTitle="Belum ada pengguna"
        emptyDescription="Daftar pelanggan dan petugas Noel Futsal akan tampil di sini."
      />

      <Drawer
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `Detail Akun: ${detail.name}` : 'Memuat Detail Akun...'}
        description="Ringkasan aktivitas, kontak, dan status verifikasi pengguna."
        size="lg"
      >
        {detail && (
          <div className="space-y-5 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-alt p-3.5">
              <div>
                <p className="text-base font-bold text-ink">{detail.name}</p>
                <p className="text-xs text-fg-muted">
                  ID Akun #{detail.id} &middot; Bergabung{' '}
                  {new Date(detail.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{roleBadgeLabel(detail.role)}</Badge>
                <Badge variant={detail.is_active ? 'success' : 'danger'}>
                  {detail.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-line p-3.5 text-xs">
                <p className="text-fg-muted">Total Booking</p>
                <p className="mt-1 text-2xl font-bold text-ink">{detail.total_bookings}x</p>
              </div>
              <div className="rounded-lg border border-line p-3.5 text-xs">
                <p className="text-fg-muted">Total Transaksi Berhasil</p>
                <CurrencyText
                  value={detail.total_spent}
                  className="mt-1 block text-2xl font-bold text-primary-900"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-line p-3.5 text-xs">
              <p className="font-semibold tracking-wider text-fg-muted uppercase">
                Informasi Kontak &amp; Verifikasi
              </p>
              <div className="flex justify-between">
                <span className="text-fg-muted">Email</span>
                <span className="font-medium text-ink">{detail.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-muted">Nomor HP</span>
                <span className="font-mono font-medium text-ink">{detail.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-muted">Status Verifikasi</span>
                <Badge variant={detail.verification_status === 'VERIFIED' ? 'success' : 'warning'} size="sm">
                  {detail.verification_status}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDetailId(null)
                  setResetTarget(detail)
                }}
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                Reset Password
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setDetailId(null)}>
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Akun Baru"
        description="Tambahkan akun petugas Admin, Owner, atau pelanggan baru ke sistem Noel Futsal."
        size="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nama Lengkap" htmlFor="new-u-name" required>
              <Input
                id="new-u-name"
                placeholder="Contoh: Budi Santoso"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Peran Akun" htmlFor="new-u-role">
              <Select
                id="new-u-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'user' | 'admin' | 'owner')}
                options={[
                  { value: 'admin', label: 'Petugas Admin Noel Futsal' },
                  { value: 'owner', label: 'Owner Noel Futsal' },
                  { value: 'user', label: 'Pelanggan' },
                ]}
              />
            </FormField>
            <FormField label="Email" htmlFor="new-u-email" required>
              <Input
                id="new-u-email"
                type="email"
                placeholder="nama@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Nomor HP / WhatsApp" htmlFor="new-u-phone" required>
              <Input
                id="new-u-phone"
                placeholder="08xxxxxxxxxx"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField
            label="Kata Sandi Awal"
            htmlFor="new-u-pass"
            hint="Minimal 8 karakter. Pengguna dapat menggantinya setelah login."
            required
          >
            <Input
              id="new-u-pass"
              type="password"
              minLength={8}
              placeholder="Minimal 8 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </FormField>

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={createUser.isPending}>
              Simpan Akun
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        title={`Reset Password`}
        description="Tetapkan kata sandi baru untuk akun terkait agar dapat login kembali."
        size="md"
      >
        <form onSubmit={handleResetSubmit} className="space-y-4">
          {resetTarget && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-alt p-3.5 text-xs">
              <div>
                <p className="font-semibold text-ink">{resetTarget.name}</p>
                <p className="text-fg-muted">{resetTarget.email}</p>
              </div>
              <Badge variant="neutral">{roleBadgeLabel(resetTarget.role)}</Badge>
            </div>
          )}

          <FormField
            label="Password Baru"
            htmlFor="reset-pwd"
            hint="Minimal 8 karakter."
            required
          >
            <Input
              id="reset-pwd"
              type="password"
              minLength={8}
              placeholder="Masukkan password baru"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              required
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>
              Batal
            </Button>
            <Button type="submit" loading={resetPassword.isPending}>
              Reset Password
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => {
          if (!toggleTarget) return
          updateUser.mutate(
            {
              id: toggleTarget.id,
              payload: {
                name: toggleTarget.name,
                phone: toggleTarget.phone,
                role: toggleTarget.role,
                is_active: !toggleTarget.is_active,
              },
            },
            {
              onSuccess: () => {
                setToggleTarget(null)
              },
            },
          )
        }}
        title={toggleTarget?.is_active ? 'Nonaktifkan Akun?' : 'Aktifkan Akun?'}
        description={
          toggleTarget?.is_active
            ? `Akun ${toggleTarget.name} tidak akan bisa login dan seluruh sesinya dicabut.`
            : `Akun ${toggleTarget?.name ?? ''} akan diaktifkan kembali.`
        }
        variant={toggleTarget?.is_active ? 'danger' : 'primary'}
        loading={updateUser.isPending}
      />
    </div>
  )
}

export default AdminUsersPage
