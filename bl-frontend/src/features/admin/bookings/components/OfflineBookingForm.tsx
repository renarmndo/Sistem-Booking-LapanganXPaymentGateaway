import { useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { AlertCircle, CheckCircle2, Copy, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { CurrencyText } from '@/components/shared'
import { Button, Card, CardBody, CardHeader, FormField, Input, Select, Textarea, useToast } from '@/components/ui'
import { SlotGrid } from '@/features/booking/components/SlotGrid'
import { useAvailability } from '@/features/booking/hooks/useAvailability'
import { useSlotSelection } from '@/features/booking/hooks/useSlotSelection'
import { useDebounce } from '@/hooks/useDebounce'
import { getErrorMessage } from '@/utils/error'
import { useAdminFields } from '../../hooks/useAdminFields'
import { useAdminUsers, useCreateOfflineBooking } from '../../hooks/useAdminOps'
import type { AdminBookingItem } from '../../types/adminOps.types'

export interface OfflineBookingFormProps {
  initialFieldId?: number
  initialDate?: string
  onCompleted?: () => void
}

const STEPS = ['1. Jadwal', '2. Pelanggan', '3. Pembayaran', '4. Konfirmasi']

function getLocalYMD(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function OfflineBookingForm({
  initialFieldId,
  initialDate,
  onCompleted,
}: OfflineBookingFormProps) {
  const toast = useToast()
  const [step, setStep] = useState(0)

  const fieldsQuery = useAdminFields({ is_active: true, limit: 20 })
  const fields = fieldsQuery.data?.items ?? []

  const [selectedFieldId, setSelectedFieldId] = useState<number>(initialFieldId ?? 0)
  const activeFieldId = selectedFieldId || fields[0]?.id || 0
  const activeField = fields.find((f) => f.id === activeFieldId)

  const [date, setDate] = useState(() => initialDate || getLocalYMD(0))
  const availQuery = useAvailability(activeFieldId, date)
  const slots = availQuery.data ?? []
  const {
    selectedSlots,
    selectedTimes,
    highlightedTimes,
    toggleSlot,
    clearSelection,
    totalAmount,
  } = useSlotSelection(slots, 6)

  const [customerMode, setCustomerMode] = useState<'guest' | 'member'>('guest')
  const [userSearch, setUserSearch] = useState('')
  const debouncedSearch = useDebounce(userSearch, 300)
  const usersQuery = useAdminUsers({ q: debouncedSearch || undefined, role: 'user', limit: 10 })
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')

  const [payMethod, setPayMethod] = useState<'cash' | 'transfer_manual'>('cash')
  const [payStatus, setPayStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid')
  const [amountPaid, setAmountPaid] = useState<number>(0)
  const [note, setNote] = useState('')
  const [stepError, setStepError] = useState<string | null>(null)

  const [createdBooking, setCreatedBooking] = useState<AdminBookingItem | null>(null)
  const createOffline = useCreateOfflineBooking()

  const effectiveAmountPaid = useMemo(() => {
    if (payStatus === 'paid') return totalAmount
    if (payStatus === 'unpaid') return 0
    return amountPaid
  }, [payStatus, totalAmount, amountPaid])

  const hasAvailableSlot = slots.some((s) => s.status === 'available')

  const handleNextStep1 = () => {
    if (!activeFieldId) {
      setStepError('Belum ada lapangan aktif yang dapat dipilih.')
      return
    }
    if (selectedSlots.length === 0) {
      setStepError('Pilih minimal 1 slot jam yang tersedia terlebih dahulu.')
      return
    }
    setStepError(null)
    setStep(1)
  }

  const handleNextStep2 = () => {
    if (customerMode === 'member') {
      if (!selectedUserId) {
        setStepError('Pilih salah satu member terdaftar terlebih dahulu.')
        return
      }
    } else {
      if (guestName.trim().length < 2) {
        setStepError('Nama pemesan minimal 2 karakter.')
        return
      }
      if (guestPhone.trim().length < 8) {
        setStepError('Nomor HP/WhatsApp minimal 8 digit.')
        return
      }
    }
    setStepError(null)
    setStep(2)
  }

  const handleNextStep3 = () => {
    if (payStatus === 'partial' && (amountPaid <= 0 || amountPaid >= totalAmount)) {
      setStepError(
        `Nominal DP harus lebih dari Rp 0 dan kurang dari Rp ${totalAmount.toLocaleString('id-ID')}.`,
      )
      return
    }
    setStepError(null)
    setStep(3)
  }

  const handleSubmit = () => {
    if (!activeFieldId || selectedSlots.length === 0) return

    createOffline.mutate(
      {
        field_id: activeFieldId,
        date,
        slots: selectedSlots.map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
        customer:
          customerMode === 'member' && selectedUserId
            ? { user_id: selectedUserId }
            : { guest_name: guestName.trim(), guest_phone: guestPhone.trim() },
        payment: {
          method: payMethod,
          status: payStatus,
          amount_paid: effectiveAmountPaid,
          note: note.trim() || undefined,
        },
      },
      {
        onSuccess: (created) => {
          setCreatedBooking(created)
        },
        onError: (err) => {
          if (isAxiosError(err) && err.response?.status === 409) {
            toast.error('Slot baru saja diambil! Silakan pilih jam lain.')
            clearSelection()
            setStep(0)
            void availQuery.refetch()
            return
          }
          toast.error(getErrorMessage(err, 'Gagal menyimpan booking offline.'))
        },
      },
    )
  }

  if (createdBooking) {
    return (
      <Card>
        <CardBody className="space-y-4 py-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Booking Offline Berhasil!</h2>
            <p className="mt-1 font-mono text-lg font-bold text-primary-900">
              {createdBooking.code}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              {createdBooking.field.name} &middot; {createdBooking.booking_date} (
              {createdBooking.start_time}–{createdBooking.end_time})
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard?.writeText(
                  `Bukti Booking Noel Futsal\nKode: ${createdBooking.code}\nLapangan: ${createdBooking.field.name}\nTanggal: ${createdBooking.booking_date} ${createdBooking.start_time}-${createdBooking.end_time}\nTotal: Rp ${createdBooking.total_amount.toLocaleString('id-ID')}`,
                )
                toast.success('Ringkasan bukti disalin ke clipboard.')
              }}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Salin Bukti
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" aria-hidden="true" />
              Cetak
            </Button>
            <Button
              onClick={() => {
                setCreatedBooking(null)
                clearSelection()
                setStep(0)
                onCompleted?.()
              }}
            >
              {onCompleted ? 'Selesai' : 'Buat Booking Lain'}
            </Button>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((label, idx) => (
          <div
            key={label}
            className={`rounded-md border px-3 py-2 text-xs font-semibold ${
              idx === step
                ? 'border-primary-800 bg-primary-900 text-surface'
                : idx < step
                  ? 'border-primary-200 bg-primary-50 text-primary-900'
                  : 'border-line bg-surface text-fg-muted'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {stepError && (
        <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-3 py-2.5 text-xs font-medium text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{stepError}</span>
        </div>
      )}

      {step === 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">
              Langkah 1: Pilih Lapangan &amp; Jam
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {!fieldsQuery.isLoading && fields.length === 0 ? (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-xs text-ink">
                <p className="font-semibold">Belum ada lapangan aktif di Noel Futsal.</p>
                <p className="mt-1 text-fg-muted">
                  Tambahkan atau aktifkan lapangan terlebih dahulu di menu Lapangan agar slot jadwal
                  dapat dipilih.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link to={PATHS.ADMIN_FIELDS}>Kelola Lapangan</Link>
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Lapangan" htmlFor="off-field">
                    <Select
                      id="off-field"
                      value={String(activeFieldId)}
                      onChange={(e) => {
                        setSelectedFieldId(Number(e.target.value))
                        clearSelection()
                        setStepError(null)
                      }}
                      options={fields.map((f) => ({ value: String(f.id), label: f.name }))}
                    />
                  </FormField>
                  <FormField label="Tanggal Main" htmlFor="off-date">
                    <Input
                      id="off-date"
                      type="date"
                      min={getLocalYMD(0)}
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value)
                        clearSelection()
                        setStepError(null)
                      }}
                    />
                  </FormField>
                </div>

                {!availQuery.isLoading && slots.length > 0 && !hasAvailableSlot && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gold-300 bg-gold-50 px-3 py-2 text-xs text-gold-900">
                    <span>Semua slot pada tanggal {date} sudah lewat atau terisi.</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setDate(getLocalYMD(1))
                        clearSelection()
                      }}
                    >
                      Pilih Tanggal Besok
                    </Button>
                  </div>
                )}

                <SlotGrid
                  slots={slots}
                  isLoading={fieldsQuery.isLoading || availQuery.isLoading}
                  isError={availQuery.isError}
                  onRetry={() => void availQuery.refetch()}
                  selectedTimes={selectedTimes}
                  highlightedTimes={highlightedTimes}
                  onToggleSlot={(slot) => {
                    setStepError(null)
                    toggleSlot(slot)
                  }}
                />
              </>
            )}

            <div className="flex items-center justify-between border-t border-line pt-4">
              <div className="text-sm">
                <span className="text-fg-muted">Total ({selectedSlots.length} jam): </span>
                <CurrencyText value={totalAmount} className="font-bold text-ink" />
              </div>
              <Button type="button" onClick={handleNextStep1}>
                Lanjut ke Pelanggan
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">
              Langkah 2: Data Pelanggan
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={customerMode === 'guest' ? 'primary' : 'secondary'}
                onClick={() => {
                  setCustomerMode('guest')
                  setStepError(null)
                }}
              >
                Tamu Walk-In
              </Button>
              <Button
                type="button"
                size="sm"
                variant={customerMode === 'member' ? 'primary' : 'secondary'}
                onClick={() => {
                  setCustomerMode('member')
                  setStepError(null)
                }}
              >
                Member Terdaftar
              </Button>
            </div>

            {customerMode === 'guest' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Nama Pemesan" htmlFor="guest-name" required>
                  <Input
                    id="guest-name"
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value)
                      setStepError(null)
                    }}
                    placeholder="Contoh: Budi Santoso"
                  />
                </FormField>
                <FormField label="Nomor HP / WhatsApp" htmlFor="guest-phone" required>
                  <Input
                    id="guest-phone"
                    value={guestPhone}
                    onChange={(e) => {
                      setGuestPhone(e.target.value)
                      setStepError(null)
                    }}
                    placeholder="0812xxxxxxxx"
                  />
                </FormField>
              </div>
            ) : (
              <div className="space-y-3">
                <FormField label="Cari Member (Nama / Email / HP)" htmlFor="member-search">
                  <Input
                    id="member-search"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Ketik nama atau nomor HP..."
                  />
                </FormField>
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {(usersQuery.data?.items ?? []).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(u.id)
                        setStepError(null)
                      }}
                      className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-xs ${
                        selectedUserId === u.id
                          ? 'border-primary-800 bg-primary-50 font-semibold text-primary-950'
                          : 'border-line bg-surface text-ink'
                      }`}
                    >
                      <span>{u.name}</span>
                      <span className="text-fg-muted">{u.phone}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between border-t border-line pt-4">
              <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                Kembali
              </Button>
              <Button type="button" onClick={handleNextStep2}>
                Lanjut ke Pembayaran
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">
              Langkah 3: Pembayaran di Tempat
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Metode Pembayaran" htmlFor="pay-method">
                <Select
                  id="pay-method"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as 'cash' | 'transfer_manual')}
                  options={[
                    { value: 'cash', label: 'Tunai (Cash)' },
                    { value: 'transfer_manual', label: 'Transfer Manual / QRIS Kasir' },
                  ]}
                />
              </FormField>
              <FormField label="Status Pembayaran" htmlFor="pay-status">
                <Select
                  id="pay-status"
                  value={payStatus}
                  onChange={(e) => {
                    setPayStatus(e.target.value as 'paid' | 'partial' | 'unpaid')
                    setStepError(null)
                  }}
                  options={[
                    { value: 'paid', label: 'Lunas' },
                    { value: 'partial', label: 'DP / Sebagian' },
                    { value: 'unpaid', label: 'Belum Bayar' },
                  ]}
                />
              </FormField>
            </div>

            {payStatus === 'partial' && (
              <FormField label="Nominal Diterima (DP)" htmlFor="pay-amount">
                <Input
                  id="pay-amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="Contoh: 100000"
                  value={amountPaid === 0 ? '' : String(amountPaid)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '')
                    setAmountPaid(digits === '' ? 0 : Number(digits))
                    setStepError(null)
                  }}
                />
              </FormField>
            )}

            <FormField label="Catatan Kasir (Opsional)" htmlFor="pay-note">
              <Textarea
                id="pay-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Contoh: Diterima kasir shift malam"
              />
            </FormField>

            <div className="flex justify-between border-t border-line pt-4">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                Kembali
              </Button>
              <Button type="button" onClick={handleNextStep3}>
                Tinjau Konfirmasi
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <h2 className="font-display text-base font-bold text-ink">
              Langkah 4: Konfirmasi Booking Offline
            </h2>
          </CardHeader>
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-fg-muted">Lapangan</span>
              <span className="font-semibold text-ink">{activeField?.name ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-muted">Tanggal &amp; Jam</span>
              <span className="font-semibold text-ink">
                {date} ({selectedSlots[0]?.start_time}–
                {selectedSlots[selectedSlots.length - 1]?.end_time})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-muted">Pelanggan</span>
              <span className="font-semibold text-ink">
                {customerMode === 'member'
                  ? `Member #${selectedUserId}`
                  : `${guestName} (${guestPhone})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-fg-muted">Pembayaran</span>
              <span className="font-semibold uppercase text-ink">
                {payMethod} &middot; {payStatus} (
                <CurrencyText value={effectiveAmountPaid} />)
              </span>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
              <span>Total Tagihan</span>
              <CurrencyText value={totalAmount} />
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Kembali
              </Button>
              <Button type="button" loading={createOffline.isPending} onClick={handleSubmit}>
                Konfirmasi &amp; Buat Booking
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
