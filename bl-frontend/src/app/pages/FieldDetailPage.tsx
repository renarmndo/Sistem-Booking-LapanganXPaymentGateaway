import { useMemo, useState } from 'react'
import { CheckCircle2, Info, MapPin, MessageCircle, Share2, ShieldCheck, Users } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { CurrencyText, ErrorState, PageLoader } from '@/components/shared'
import { Badge, Button, Card, Tabs, useToast } from '@/components/ui'
import { useAuth } from '@/features/auth'
import {
  BookingSummary,
  DateStrip,
  SlotGrid,
  SlotLegend,
  StickyBookingBar,
  useAvailability,
  useCheckoutDraftStore,
  useSlotSelection,
} from '@/features/booking'
import {
  FacilityList,
  FieldGallery,
  PriceInfo,
  useFieldDetail,
} from '@/features/fields'

function todayYMD(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type SlotPeriod = 'all' | 'morning' | 'afternoon' | 'night'

export function FieldDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { isAuthenticated } = useAuth()
  const draft = useCheckoutDraftStore((s) => s.draft)
  const setDraft = useCheckoutDraftStore((s) => s.setDraft)

  const matchingDraft = draft && String(draft.fieldId) === String(id) ? draft : null
  const [selectedDate, setSelectedDate] = useState(() => matchingDraft?.date ?? todayYMD())
  const [activeTab, setActiveTab] = useState('jadwal')
  const [slotPeriod, setSlotPeriod] = useState<SlotPeriod>('all')

  const fieldQuery = useFieldDetail(id)
  const availabilityQuery = useAvailability(id, selectedDate)
  const slots = useMemo(() => availabilityQuery.data ?? [], [availabilityQuery.data])
  const filteredSlots = useMemo(() => {
    if (slotPeriod === 'all') return slots
    return slots.filter((slot) => {
      const hour = Number(slot.start_time.split(':')[0])
      if (slotPeriod === 'morning') return hour < 12
      if (slotPeriod === 'afternoon') return hour >= 12 && hour < 18
      return hour >= 18
    })
  }, [slots, slotPeriod])
  const {
    selectedSlots,
    selectedTimes,
    highlightedTimes,
    totalAmount,
    timeRange,
    selectionError,
    toggleSlot,
    clearSelection,
  } = useSlotSelection(slots, undefined, matchingDraft?.slots ?? [])

  const handleDateChange = (nextDate: string) => {
    setSelectedDate(nextDate)
    clearSelection()
  }

  const handleProceed = () => {
    if (!fieldQuery.data || selectedSlots.length === 0) return
    setDraft({
      fieldId: fieldQuery.data.id,
      fieldName: fieldQuery.data.name,
      surfaceType: fieldQuery.data.surface_type,
      capacity: fieldQuery.data.capacity,
      date: selectedDate,
      slots: selectedSlots,
      totalAmount,
    })
    if (!isAuthenticated) {
      navigate(PATHS.LOGIN, {
        state: { from: { pathname: location.pathname, search: location.search } },
      })
      return
    }
    navigate(PATHS.CHECKOUT)
  }

  if (fieldQuery.isLoading) {
    return <PageLoader label="Memuat detail lapangan..." />
  }

  if (fieldQuery.isError || !fieldQuery.data) {
    return (
      <div className="w-full px-4 py-12 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <ErrorState
          title="Lapangan Tidak Ditemukan"
          message="Gagal memuat detail lapangan atau lapangan sudah tidak aktif."
          onRetry={() => void fieldQuery.refetch()}
        />
      </div>
    )
  }

  const field = fieldQuery.data
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Tautan lapangan berhasil disalin')
    } catch {
      toast.info('Salin URL dari address bar browser Anda')
    }
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-10 lg:pb-10 xl:px-14 2xl:px-16">
      <div className="space-y-3">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
          <Link to={PATHS.HOME} className="hover:text-ink">
            Beranda
          </Link>
          <span>/</span>
          <Link to={PATHS.FIELDS} className="hover:text-ink">
            Lapangan
          </Link>
          <span>/</span>
          <span className="font-medium text-ink">{field.name}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-primary-950 px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide text-gold-300 uppercase">
            {field.surface_type}
          </span>
          <Badge variant="gold" size="sm">
            Populer
          </Badge>
          <Badge variant="neutral" size="sm">
            Kapasitas {field.capacity} Pemain
          </Badge>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              {field.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary-700" aria-hidden="true" />
                {field.address || field.city || 'Noel Futsal Arena'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary-700" aria-hidden="true" />
                Maks. {field.capacity} pemain
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-primary-800">
                <CheckCircle2 className="h-4 w-4 text-primary-700" aria-hidden="true" />
                Konfirmasi Instan
              </span>
            </div>
          </div>

          <Button type="button" size="sm" variant="secondary" onClick={() => void handleShare()}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Bagikan
          </Button>
        </div>
      </div>

      <FieldGallery name={field.name} photos={field.photos} />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Tabs
            activeId={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'jadwal', label: 'Jadwal & Slot Lapangan' },
              { id: 'spesifikasi', label: 'Spesifikasi & Tarif' },
              { id: 'fasilitas', label: 'Fasilitas', badge: field.facilities.length },
              { id: 'aturan', label: 'Aturan & Pembatalan' },
            ]}
          />

          {activeTab === 'jadwal' && (
            <Card padding="md" className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wider text-primary-700 uppercase">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-primary-600" aria-hidden="true" />
                    Live Inventory Synchronized
                  </p>
                  <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
                    Pilih Tanggal &amp; Slot Waktu
                  </h2>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-medium text-fg-muted">Tarif Mulai Dari</p>
                  <CurrencyText
                    value={field.min_price}
                    suffix="/jam"
                    className="text-xl font-extrabold text-ink"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-gold-300/60 bg-gold-50/70 p-3 text-xs text-ink">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden="true" />
                <p className="leading-relaxed">
                  <strong>Sinkronisasi Real-Time:</strong> Sistem otomatis mengamankan slot yang Anda pilih
                  selama proses checkout untuk menghindari bentrok jadwal dengan pemain lain.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink">Pilih Tanggal Booking</p>
                <DateStrip selectedDate={selectedDate} onSelectDate={handleDateChange} />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-y border-line py-3">
                {(
                  [
                    { id: 'all', label: `Semua Slot (${slots.length})` },
                    { id: 'morning', label: 'Pagi (06:00–12:00)' },
                    { id: 'afternoon', label: 'Siang & Sore (12:00–18:00)' },
                    { id: 'night', label: 'Prime Time Malam (18:00–24:00)' },
                  ] as const
                ).map((period) => (
                  <button
                    key={period.id}
                    type="button"
                    onClick={() => setSlotPeriod(period.id)}
                    className={
                      slotPeriod === period.id
                        ? 'rounded-full bg-primary-950 px-3.5 py-1.5 text-xs font-semibold text-surface transition'
                        : 'rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-fg-muted transition hover:border-primary-400 hover:text-ink'
                    }
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              <SlotGrid
                slots={filteredSlots}
                isLoading={availabilityQuery.isLoading}
                isError={availabilityQuery.isError}
                onRetry={() => void availabilityQuery.refetch()}
                selectedTimes={selectedTimes}
                highlightedTimes={highlightedTimes}
                onToggleSlot={toggleSlot}
              />

              <SlotLegend />
            </Card>
          )}

          {activeTab === 'spesifikasi' && (
            <div className="space-y-5">
              <Card padding="md" className="space-y-3">
                <h2 className="font-display text-lg font-bold text-ink">Spesifikasi &amp; Deskripsi Arena</h2>
                <p className="text-sm leading-relaxed text-fg-muted">
                  {field.description || 'Belum ada deskripsi tambahan untuk lapangan ini.'}
                </p>
                <div className="grid gap-3 pt-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-line bg-surface-alt/50 p-3 text-xs">
                    <p className="text-fg-muted">Jenis Rumput</p>
                    <p className="mt-0.5 font-semibold text-ink">{field.surface_type}</p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-alt/50 p-3 text-xs">
                    <p className="text-fg-muted">Kapasitas Ideal</p>
                    <p className="mt-0.5 font-semibold text-ink">{field.capacity} Pemain</p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface-alt/50 p-3 text-xs">
                    <p className="text-fg-muted">Lokasi</p>
                    <p className="mt-0.5 font-semibold text-ink">{field.city || 'Noel Futsal'}</p>
                  </div>
                </div>
              </Card>
              <PriceInfo prices={field.prices} operatingHours={field.operating_hours} />
            </div>
          )}

          {activeTab === 'fasilitas' && <FacilityList facilities={field.facilities} />}

          {activeTab === 'aturan' && (
            <Card padding="md" className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary-700" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-ink">Aturan Venue &amp; Kebijakan Pembatalan</h2>
              </div>
              <ul className="space-y-2.5 text-sm text-fg-muted">
                <li>&bull; Harap tiba minimal 15 menit sebelum jadwal bermain dimulai untuk check-in di meja kasir.</li>
                <li>&bull; Wajib menggunakan sepatu futsal atau sepatu olahraga non-marking yang bersih.</li>
                <li>&bull; Dilarang membawa makanan, minuman keras, atau merokok di dalam area lapangan.</li>
                <li>&bull; Pembatalan atau pengajuan refund mengikuti ketentuan waktu minimal sebelum jam main di portal Riwayat Booking.</li>
              </ul>
            </Card>
          )}
        </div>

        {/* Sticky Booking Summary Panel (Desktop) */}
        <aside className="space-y-4 lg:col-span-4">
          <BookingSummary
            fieldName={field.name}
            surfaceType={field.surface_type}
            capacity={field.capacity}
            coverUrl={field.cover_url}
            selectedDate={selectedDate}
            selectedSlots={selectedSlots}
            totalAmount={totalAmount}
            timeRange={timeRange}
            selectionError={selectionError}
            onProceed={handleProceed}
            onClear={clearSelection}
          />

          <Card padding="sm" className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-ink">Tanya Pengelola Lapangan</p>
                <p className="text-fg-muted">Butuh custom event atau sparing tim?</p>
              </div>
            </div>
            <Link
              to={PATHS.HELP}
              className="shrink-0 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface-alt"
            >
              Bantuan
            </Link>
          </Card>
        </aside>
      </div>

      <StickyBookingBar
        slotCount={selectedSlots.length}
        timeRange={timeRange}
        totalAmount={totalAmount}
        onProceed={handleProceed}
      />
    </div>
  )
}

export default FieldDetailPage
