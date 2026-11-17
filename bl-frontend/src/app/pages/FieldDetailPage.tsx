import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, ErrorState, PageLoader } from '@/components/shared'
import { Badge, Button, Card, CardBody, Tabs } from '@/components/ui'
import { DateStrip, SlotGrid, SlotLegend, useAvailability } from '@/features/booking'
import {
  FacilityList,
  FieldGallery,
  PriceInfo,
  useFieldDetail,
} from '@/features/fields'
import { formatDate } from '@/utils/formatDate'

function todayYMD(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function FieldDetailPage() {
  const { id = '' } = useParams()
  const [selectedDate, setSelectedDate] = useState(todayYMD)
  const [activeTab, setActiveTab] = useState('jadwal')

  const fieldQuery = useFieldDetail(id)
  const availabilityQuery = useAvailability(id, selectedDate)

  if (fieldQuery.isLoading) {
    return <PageLoader label="Memuat detail lapangan..." />
  }

  if (fieldQuery.isError || !fieldQuery.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <ErrorState
          title="Lapangan Tidak Ditemukan"
          message="Gagal memuat detail lapangan atau lapangan sudah tidak aktif."
          onRetry={() => void fieldQuery.refetch()}
        />
      </div>
    )
  }

  const field = fieldQuery.data
  const slots = availabilityQuery.data ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="gold" size="sm">
            {field.surface_type}
          </Badge>
          <Badge variant="neutral" size="sm">
            Kapasitas {field.capacity} pemain
          </Badge>
        </div>

        <PageHeader
          title={field.name}
          subtitle={`${field.surface_type} · Operasional setiap hari sesuai jadwal`}
          breadcrumbs={[
            { label: 'Beranda', to: PATHS.HOME },
            { label: 'Lapangan', to: PATHS.FIELDS },
            { label: field.name },
          ]}
          showBack
        />
      </div>

      <FieldGallery name={field.name} photos={field.photos} />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Tabs
            activeId={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'jadwal', label: 'Jadwal & Slot Lapangan' },
              { id: 'fasilitas', label: 'Fasilitas', badge: field.facilities.length },
              { id: 'tarif', label: 'Tarif & Jam Operasional' },
              { id: 'deskripsi', label: 'Deskripsi' },
            ]}
          />

          {activeTab === 'jadwal' && (
            <Card padding="md" className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-[11px] font-semibold text-primary-700 uppercase">
                    Live Inventory Synchronized
                  </p>
                  <h2 className="font-display text-xl font-bold text-ink">
                    Pilih Tanggal &amp; Slot Waktu
                  </h2>
                </div>
                <CurrencyText
                  value={field.min_price}
                  suffix="/jam"
                  className="text-lg font-bold text-ink"
                />
              </div>

              <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

              <SlotGrid
                slots={slots}
                isLoading={availabilityQuery.isLoading}
                isError={availabilityQuery.isError}
                onRetry={() => void availabilityQuery.refetch()}
              />

              <SlotLegend />
            </Card>
          )}

          {activeTab === 'fasilitas' && <FacilityList facilities={field.facilities} />}

          {activeTab === 'tarif' && (
            <PriceInfo prices={field.prices} operatingHours={field.operating_hours} />
          )}

          {activeTab === 'deskripsi' && (
            <Card padding="md">
              <h2 className="font-display text-lg font-bold text-ink">Tentang Lapangan</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                {field.description || 'Belum ada deskripsi tambahan untuk lapangan ini.'}
              </p>
            </Card>
          )}
        </div>

        {/* Sticky Booking Preview Panel (Desktop) */}
        <aside className="lg:col-span-4">
          <Card padding="md" className="space-y-4 lg:sticky lg:top-20">
            <div className="border-b border-line pb-3">
              <p className="font-mono text-[10px] font-semibold text-fg-muted uppercase">
                Ringkasan Lapangan
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-ink">{field.name}</h3>
              <p className="text-xs text-fg-muted">
                {field.surface_type} &middot; {field.capacity} pemain
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Tanggal Dipilih</span>
                <span className="font-semibold text-ink">
                  {formatDate(selectedDate, { includeDay: true, shortMonth: true })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Tarif Mulai</span>
                <CurrencyText value={field.min_price} suffix="/jam" className="font-bold text-ink" />
              </div>
            </div>

            <CardBody className="rounded-md bg-surface-alt p-3 text-xs text-fg-muted">
              Lihat ketersediaan slot secara real-time di sebelah kiri. Fitur pemesanan online
              akan aktif pada fase berikutnya.
            </CardBody>

            <Button fullWidth disabled>
              Booking Segera Hadir
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default FieldDetailPage
