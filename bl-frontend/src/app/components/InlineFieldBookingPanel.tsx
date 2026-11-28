import { useMemo, useState } from 'react'
import { Info, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { CurrencyText, ErrorState } from '@/components/shared'
import { Badge, Card, Skeleton, Tabs } from '@/components/ui'
import { useAuth } from '@/features/auth'
import {
  BookingSummary,
  DateStrip,
  SlotGrid,
  SlotLegend,
  useAvailability,
  useAvailabilitySummary,
  useCheckoutDraftStore,
  useSlotSelection,
} from '@/features/booking'
import {
  FacilityList,
  PriceInfo,
  useFieldDetail,
  type FieldSummary,
} from '@/features/fields'

function todayYMD(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

type SlotPeriod = 'all' | 'morning' | 'afternoon' | 'night'

export interface InlineFieldBookingPanelProps {
  fieldSummary: FieldSummary
  initialDate?: string
}

export function InlineFieldBookingPanel({
  fieldSummary,
  initialDate,
}: InlineFieldBookingPanelProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const draft = useCheckoutDraftStore((s) => s.draft)
  const setDraft = useCheckoutDraftStore((s) => s.setDraft)

  const fieldId = fieldSummary.id
  const today = todayYMD()
  const rawDraft = draft && String(draft.fieldId) === String(fieldId) ? draft : null
  const matchingDraft = rawDraft && rawDraft.date >= today ? rawDraft : null
  const validInitialDate = initialDate && initialDate >= today ? initialDate : undefined

  const [selectedDate, setSelectedDate] = useState(
    () => matchingDraft?.date ?? validInitialDate ?? today,
  )
  const [activeTab, setActiveTab] = useState('jadwal')
  const [slotPeriod, setSlotPeriod] = useState<SlotPeriod>('all')

  const fieldQuery = useFieldDetail(fieldId)
  const availabilityQuery = useAvailability(fieldId, selectedDate)
  const summaryQuery = useAvailabilitySummary(fieldId)

  const slots = useMemo(() => availabilityQuery.data ?? [], [availabilityQuery.data])

  const availabilityMap = useMemo(() => {
    const map: Record<string, { available_slots: number; total_slots: number }> = {}
    for (const item of summaryQuery.data ?? []) {
      map[item.date] = {
        available_slots: item.available_slots,
        total_slots: item.total_slots,
      }
    }
    return map
  }, [summaryQuery.data])

  const periodAvailabilityCounts = useMemo(() => {
    let all = 0
    let morning = 0
    let afternoon = 0
    let night = 0
    for (const slot of slots) {
      if (slot.status !== 'available') continue
      all += 1
      const hour = Number(slot.start_time.split(':')[0])
      if (hour < 12) morning += 1
      else if (hour < 18) afternoon += 1
      else night += 1
    }
    return { all, morning, afternoon, night }
  }, [slots])

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

  const field = fieldQuery.data

  const handleProceed = () => {
    if (selectedSlots.length === 0) return
    setDraft({
      fieldId: field?.id ?? fieldSummary.id,
      fieldName: field?.name ?? fieldSummary.name,
      surfaceType: field?.surface_type ?? fieldSummary.surface_type,
      capacity: field?.capacity ?? fieldSummary.capacity,
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

  if (fieldQuery.isError) {
    return (
      <div className="border-t border-line bg-bg/60 p-4 sm:p-6">
        <ErrorState
          title="Gagal Memuat Detail Lapangan"
          message="Terjadi kesalahan saat memuat jadwal dan informasi lapangan."
          onRetry={() => void fieldQuery.refetch()}
        />
      </div>
    )
  }

  const facilitiesCount = field?.facilities.length ?? fieldSummary.facilities.length

  return (
    <div className="border-t border-line bg-bg/60 p-4 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <Tabs
            activeId={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'jadwal', label: 'Jadwal & Slot Lapangan' },
              { id: 'spesifikasi', label: 'Spesifikasi & Tarif' },
              { id: 'fasilitas', label: 'Fasilitas', badge: facilitiesCount },
              { id: 'aturan', label: 'Aturan & Pembayaran' },
            ]}
          />

          {activeTab === 'jadwal' && (
            <Card padding="md" className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wider text-primary-700 uppercase">
                    <span
                      className="h-2 w-2 animate-pulse rounded-full bg-primary-600"
                      aria-hidden="true"
                    />
                    Live Inventory Synchronized
                  </p>
                  <h3 className="font-display text-lg font-bold text-ink sm:text-xl">
                    Pilih Tanggal &amp; Slot Waktu
                  </h3>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[11px] font-medium text-fg-muted">Tarif Mulai Dari</p>
                  <CurrencyText
                    value={field?.min_price ?? fieldSummary.min_price}
                    suffix="/jam"
                    className="text-lg font-extrabold text-ink"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-gold-300/60 bg-gold-50/70 p-3 text-xs text-ink">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden="true" />
                <p className="leading-relaxed">
                  <strong>Sinkronisasi Real-Time:</strong> Sistem otomatis mengamankan slot yang
                  Anda pilih selama proses checkout untuk menghindari bentrok jadwal dengan pemain
                  lain.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">Pilih Tanggal Booking</p>
                  {!availabilityQuery.isLoading && (
                    <Badge
                      variant={periodAvailabilityCounts.all > 0 ? 'primary' : 'neutral'}
                      size="sm"
                    >
                      {periodAvailabilityCounts.all > 0
                        ? `${periodAvailabilityCounts.all} jadwal tersedia`
                        : 'Jadwal penuh'}
                    </Badge>
                  )}
                </div>
                <DateStrip
                  selectedDate={selectedDate}
                  onSelectDate={handleDateChange}
                  availabilityMap={availabilityMap}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-y border-line py-3">
                {(
                  [
                    { id: 'all', label: `Semua (${periodAvailabilityCounts.all} tersedia)` },
                    { id: 'morning', label: `Pagi 06–12 (${periodAvailabilityCounts.morning})` },
                    {
                      id: 'afternoon',
                      label: `Siang & Sore 12–18 (${periodAvailabilityCounts.afternoon})`,
                    },
                    { id: 'night', label: `Malam 18–24 (${periodAvailabilityCounts.night})` },
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
            <div className="space-y-4">
              {fieldQuery.isLoading ? (
                <Skeleton className="h-48 w-full rounded-xl" />
              ) : (
                <>
                  <Card padding="md" className="space-y-3">
                    <h3 className="font-display text-base font-bold text-ink">
                      Spesifikasi &amp; Deskripsi Arena
                    </h3>
                    <p className="text-sm leading-relaxed text-fg-muted">
                      {field?.description || 'Belum ada deskripsi tambahan untuk lapangan ini.'}
                    </p>
                    <div className="grid gap-3 pt-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-line bg-surface-alt/50 p-3 text-xs">
                        <p className="text-fg-muted">Jenis Rumput</p>
                        <p className="mt-0.5 font-semibold text-ink">
                          {field?.surface_type ?? fieldSummary.surface_type}
                        </p>
                      </div>
                      <div className="rounded-lg border border-line bg-surface-alt/50 p-3 text-xs">
                        <p className="text-fg-muted">Kapasitas Ideal</p>
                        <p className="mt-0.5 font-semibold text-ink">
                          {field?.capacity ?? fieldSummary.capacity} Pemain
                        </p>
                      </div>
                      <div className="rounded-lg border border-line bg-surface-alt/50 p-3 text-xs">
                        <p className="text-fg-muted">Lokasi</p>
                        <p className="mt-0.5 font-semibold text-ink">
                          {field?.city || 'Noel Futsal'}
                        </p>
                      </div>
                    </div>
                  </Card>
                  {field && (
                    <PriceInfo prices={field.prices} operatingHours={field.operating_hours} />
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'fasilitas' && (
            fieldQuery.isLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : (
              <FacilityList facilities={field?.facilities ?? fieldSummary.facilities} />
            )
          )}

          {activeTab === 'aturan' && (
            <Card padding="md" className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary-700" aria-hidden="true" />
                <h3 className="font-display text-base font-bold text-ink">
                  Aturan Venue &amp; Ketentuan Pembayaran
                </h3>
              </div>
              <ul className="space-y-2.5 text-sm text-fg-muted">
                <li>
                  &bull; Harap tiba minimal 15 menit sebelum jadwal bermain dimulai untuk check-in
                  di meja kasir.
                </li>
                <li>
                  &bull; Wajib menggunakan sepatu futsal atau sepatu olahraga non-marking yang
                  bersih.
                </li>
                <li>
                  &bull; Dilarang membawa makanan, minuman keras, atau merokok di dalam area
                  lapangan.
                </li>
                <li>
                  &bull; <strong>Pembayaran Full Payment (100%):</strong> tidak dapat dibatalkan dan{' '}
                  <strong>tidak ada pengembalian dana</strong>.
                </li>
                <li>
                  &bull; <strong>Pembayaran DP 50%:</strong> pelunasan sisa 50% wajib dilakukan
                  paling lambat <strong>H-1 jam / 30 menit sebelum jadwal main</strong> dan tidak
                  dapat dibatalkan.
                </li>
              </ul>
            </Card>
          )}
        </div>

        <aside className="lg:col-span-4">
          <BookingSummary
            fieldName={field?.name ?? fieldSummary.name}
            surfaceType={field?.surface_type ?? fieldSummary.surface_type}
            capacity={field?.capacity ?? fieldSummary.capacity}
            coverUrl={field?.cover_url ?? fieldSummary.cover_url}
            selectedDate={selectedDate}
            selectedSlots={selectedSlots}
            totalAmount={totalAmount}
            timeRange={timeRange}
            selectionError={selectionError}
            onProceed={handleProceed}
            onClear={clearSelection}
          />
        </aside>
      </div>
    </div>
  )
}
