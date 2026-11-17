import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  DatePicker,
  Drawer,
  FormField,
  Input,
  Modal,
  Pagination,
  PasswordInput,
  PitchPattern,
  Select,
  Skeleton,
  Spinner,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui'
import {
  ConfirmDialog,
  CurrencyText,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageLoader,
  SearchInput,
  StatCard,
  StatusBadge,
} from '@/components/shared'

export function PlaygroundPage() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [agree, setAgree] = useState(false)
  const [activeTab, setActiveTab] = useState('jadwal')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('2026-11-18')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  return (
    <main className="min-h-screen bg-bg text-fg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="font-mono text-xs text-primary-700 uppercase">Dev Playground</p>
            <h1 className="font-display text-2xl font-bold text-ink">Komponen UI Dasar</h1>
          </div>
          <Link
            to="/"
            className="text-sm font-semibold text-primary-700 underline-offset-4 hover:underline"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold text-ink">Button</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <Button fullWidth>Full Width Button</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold text-ink">Form Controls</h2>
          </CardHeader>
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nama Lengkap" htmlFor="pg-name" hint="Sesuai identitas" required>
              <Input id="pg-name" placeholder="Budi Santoso" />
            </FormField>
            <FormField label="Email" htmlFor="pg-email" error="Format email tidak valid">
              <Input id="pg-email" defaultValue="budi@" error />
            </FormField>
            <FormField label="Kata Sandi" htmlFor="pg-pass" hint="Minimal 8 karakter">
              <PasswordInput id="pg-pass" placeholder="Masukkan kata sandi" />
            </FormField>
            <FormField label="Jenis Lapangan" htmlFor="pg-field">
              <Select
                id="pg-field"
                defaultValue="sintetis"
                options={[
                  { value: 'sintetis', label: 'Rumput Sintetis' },
                  { value: 'alami', label: 'Rumput Alami' },
                ]}
              />
            </FormField>
            <FormField label="Catatan" htmlFor="pg-note" className="sm:col-span-2">
              <Textarea id="pg-note" placeholder="Tambahkan catatan..." />
            </FormField>
            <div className="sm:col-span-2">
              <Checkbox
                label="Saya menyetujui syarat dan ketentuan"
                description="Berlaku untuk seluruh transaksi pemesanan."
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold text-ink">
              Badge, Spinner &amp; Skeleton
            </h2>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">Neutral</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="gold">Populer</Badge>
              <Badge variant="success">Lunas</Badge>
              <Badge variant="warning">Menunggu</Badge>
              <Badge variant="danger">Dibatalkan</Badge>
              <Badge variant="info">Informasi</Badge>
            </div>
            <div className="flex items-center gap-4 text-primary-600">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton variant="text" />
              <Skeleton variant="rect" className="h-12" />
              <Skeleton variant="circle" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-xl font-semibold text-ink">Modal &amp; Toast</h2>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-3">
            <Button onClick={() => setModalOpen(true)}>Buka Modal / Bottom Sheet</Button>
            <Button
              variant="secondary"
              onClick={() => toast.success('Data berhasil disimpan.', 'Berhasil')}
            >
              Toast Success
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.error('Gagal memproses permintaan.', 'Gagal')}
            >
              Toast Error
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.warning('Slot hampir penuh.', 'Peringatan')}
            >
              Toast Warning
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast.info('Jadwal diperbarui otomatis.', 'Info')}
            >
              Toast Info
            </Button>
          </CardBody>
          <CardFooter className="text-xs text-fg-muted">
            Di layar kecil (&lt;640 px) modal tampil sebagai bottom sheet; di desktop sebagai dialog.
          </CardFooter>
        </Card>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-ink">
            Katalog &amp; Dashboard Shared Components
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Pendapatan"
              value="Rp 18.500.000"
              delta={{ value: '+12% bulan ini', trend: 'up' }}
            />
            <StatCard
              label="Booking Aktif"
              value={42}
              delta={{ value: 'Stabil minggu ini', trend: 'neutral' }}
            />
            <StatCard
              label="Pembatalan"
              value={2}
              delta={{ value: '-5% vs bulan lalu', trend: 'down' }}
            />
          </div>

          <Card>
            <CardBody className="space-y-4">
              <Tabs
                activeId={activeTab}
                onChange={setActiveTab}
                items={[
                  { id: 'jadwal', label: 'Jadwal & Slot' },
                  { id: 'fasilitas', label: 'Fasilitas', badge: 7 },
                  { id: 'ulasan', label: 'Ulasan', badge: 24 },
                ]}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <SearchInput value={search} onChange={setSearch} placeholder="Cari arena..." />
                <DatePicker value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="available" />
                <StatusBadge status="pending" />
                <StatusBadge status="paid" />
                <StatusBadge status="cancelled" />
                <StatusBadge status="refunded" />
                <Button size="sm" variant="secondary" onClick={() => setDrawerOpen(true)}>
                  Buka Drawer
                </Button>
                <Button size="sm" variant="danger" onClick={() => setConfirmOpen(true)}>
                  Buka ConfirmDialog
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <PitchPattern variant="stripes" className="h-14 rounded-sm p-2 text-xs text-surface">
                  stripes
                </PitchPattern>
                <PitchPattern variant="lines" className="h-14 rounded-sm p-2 text-xs text-surface">
                  lines
                </PitchPattern>
                <PitchPattern variant="dots" className="h-14 rounded-sm border border-line p-2 text-xs">
                  dots
                </PitchPattern>
                <PitchPattern variant="hatch" className="h-14 rounded-sm border border-line p-2 text-xs">
                  hatch
                </PitchPattern>
                <PitchPattern variant="blocked" className="h-14 rounded-sm border border-line p-2 text-xs">
                  blocked
                </PitchPattern>
              </div>
            </CardBody>
          </Card>

          <DataTable
            data={[
              { id: 1, name: 'Arena Utama A', surface: 'Sintetis', price: 175000, status: 'active' },
              { id: 2, name: 'Arena Indoor B', surface: 'Sintetis', price: 200000, status: 'pending' },
            ]}
            keyExtractor={(row) => row.id}
            sortKey="name"
            sortDir={sortDir}
            onSort={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            page={page}
            totalPages={4}
            onPageChange={setPage}
            columns={[
              { key: 'name', header: 'Lapangan', sortable: true, render: (r) => r.name },
              { key: 'surface', header: 'Rumput', render: (r) => r.surface },
              {
                key: 'price',
                header: 'Tarif',
                render: (r) => <CurrencyText value={r.price} suffix="/jam" />,
              },
              { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
          <Pagination page={page} totalPages={4} onPageChange={setPage} />
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-ink">State Components</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              title="Belum ada jadwal"
              description="Pilih tanggal lain untuk melihat slot yang tersedia."
              action={<Button size="sm">Reset Filter</Button>}
            />
            <ErrorState
              message="Tidak dapat mengambil daftar lapangan."
              onRetry={() => toast.info('Mencoba memuat ulang...')}
            />
          </div>
          <LoadingState variant="cards" count={3} />
          <Card>
            <PageLoader label="Contoh PageLoader..." className="min-h-40" />
          </Card>
        </section>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Konfirmasi Pemesanan"
        description="Pastikan jadwal dan lapangan yang dipilih sudah sesuai."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false)
                toast.success('Pemesanan dikonfirmasi.')
              }}
            >
              Lanjutkan
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          Modal ini mendukung tombol ESC, klik backdrop, dan mengembalikan fokus ke tombol pemicu
          saat ditutup.
        </p>
      </Modal>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filter Arena">
        <p className="text-sm text-fg-muted">Contoh konten drawer untuk filter mobile atau detail cepat.</p>
      </Drawer>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          toast.success('Aksi dikonfirmasi.')
        }}
        title="Batalkan Booking?"
        description="Slot akan dilepas dan pengembalian dana diproses sesuai kebijakan."
        confirmLabel="Ya, Batalkan"
      />
    </main>
  )
}
