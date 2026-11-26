import { useState } from 'react'
import { AlertCircle, Banknote, Check, ChevronDown, Clock, ShieldCheck, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { CurrencyText, EmptyState } from '@/components/shared'
import { Button, Card, CardBody, CardHeader } from '@/components/ui'
import { cn } from '@/utils/cn'
import { getErrorMessage } from '@/utils/error'
import { formatDate } from '@/utils/formatDate'
import { formatSlotRange } from '@/utils/slot.utils'
import { useCreateBooking } from '../hooks/useCreateBooking'
import { useCheckoutDraftStore } from '../store/checkoutDraft.store'
import type { PaymentType } from '../types/booking.types'

const STEPS = [
  { num: 1, label: 'Pilih Jadwal', done: true },
  { num: 2, label: 'Konfirmasi & Bayar', active: true },
  { num: 3, label: 'Status Pembayaran' },
]

export function CheckoutPage() {
  const draft = useCheckoutDraftStore((s) => s.draft)
  const createBooking = useCreateBooking()

  const [policyOpen, setPolicyOpen] = useState(true)
  const [paymentType, setPaymentType] = useState<PaymentType>('full')
  const [agreed, setAgreed] = useState(false)

  if (!draft || draft.slots.length === 0) {
    return (
      <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <EmptyState
          title="Belum ada jadwal yang dipilih"
          description="Pilih lapangan dan jam bermain terlebih dahulu sebelum melanjutkan ke checkout."
          action={
            <Button asChild variant="accent">
              <Link to={PATHS.FIELDS}>Cari Lapangan</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const timeRange = formatSlotRange(draft.slots)
  const payAmount = paymentType === 'dp' ? Math.floor(draft.totalAmount / 2) : draft.totalAmount
  const remainingAmount = draft.totalAmount - payAmount
  const errorMessage = createBooking.isError
    ? getErrorMessage(createBooking.error, 'Gagal memproses booking.')
    : null

  const handleConfirm = () => {
    if (!agreed) return
    createBooking.mutate({
      field_id: draft.fieldId,
      date: draft.date,
      slots: draft.slots.map((s) => ({
        start_time: s.start_time,
        end_time: s.end_time,
      })),
      payment_type: paymentType,
    })
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-10 lg:pb-10 xl:px-14 2xl:px-16">
      <PageHeader
        title="Ringkasan & Konfirmasi Booking"
        subtitle="Periksa kembali detail jadwal dan kebijakan pembatalan sebelum mengunci slot."
        breadcrumbs={[
          { label: 'Beranda', to: PATHS.HOME },
          { label: 'Lapangan', to: PATHS.FIELDS },
          { label: draft.fieldName, to: PATHS.FIELD_DETAIL(draft.fieldId) },
          { label: 'Checkout' },
        ]}
      />

      {/* Stepper */}
      <nav aria-label="Tahapan Checkout" className="grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface p-3 sm:p-4">
        {STEPS.map((step) => (
          <div key={step.num} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold',
                step.done
                  ? 'bg-primary-100 text-primary-800'
                  : step.active
                    ? 'bg-primary-950 text-gold-300'
                    : 'bg-surface-alt text-fg-muted',
              )}
            >
              {step.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step.num}
            </span>
            <span
              className={cn(
                'truncate text-xs font-semibold sm:text-sm',
                step.active ? 'text-ink' : 'text-fg-muted',
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </nav>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger-soft/60 p-3.5 text-sm text-danger-ink"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {/* Booking Summary Card */}
          <Card>
            <CardHeader>
              <h2 className="font-display text-lg font-bold text-ink">{draft.fieldName}</h2>
              <p className="text-xs text-fg-muted">
                {draft.surfaceType} &middot; Kapasitas {draft.capacity} pemain
              </p>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-fg-muted">Tanggal Main</span>
                <span className="font-semibold text-ink">
                  {formatDate(draft.date, { includeDay: true })}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-line pb-2.5">
                <span className="text-fg-muted">Total Durasi</span>
                <span className="font-semibold text-ink">
                  {draft.slots.length} jam ({timeRange})
                </span>
              </div>
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-fg-muted uppercase">Rincian Harga Slot</p>
                {draft.slots.map((slot) => (
                  <div key={slot.start_time} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-fg">
                      {slot.start_time} – {slot.end_time}
                    </span>
                    <CurrencyText value={slot.price} className="font-semibold text-ink" />
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Payment Option Selector */}
          <Card padding="md" className="space-y-4">
            <div>
              <h2 className="font-display text-base font-bold text-ink">Pilih Skema Pembayaran</h2>
              <p className="text-xs text-fg-muted">
                Pilih pembayaran penuh atau uang muka (DP 50%) untuk mengunci jadwal Anda.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Skema Pembayaran">
              <button
                type="button"
                role="radio"
                aria-checked={paymentType === 'full'}
                onClick={() => setPaymentType('full')}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition',
                  paymentType === 'full'
                    ? 'border-primary-700 bg-primary-50/70 ring-2 ring-primary-200'
                    : 'border-line bg-surface hover:border-primary-300',
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                    <Wallet className="h-4 w-4 text-primary-700" aria-hidden="true" />
                    Full Payment (100%)
                  </span>
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border',
                      paymentType === 'full'
                        ? 'border-primary-700 bg-primary-700 text-surface'
                        : 'border-line-strong',
                    )}
                  >
                    {paymentType === 'full' && <Check className="h-2.5 w-2.5" aria-hidden="true" />}
                  </span>
                </div>
                <CurrencyText value={draft.totalAmount} className="text-base font-extrabold text-primary-900" />
                <p className="text-xs leading-relaxed text-fg-muted">
                  Bayar lunas sekarang. <strong>Tidak ada pengembalian dana</strong> dan tidak dapat dibatalkan.
                </p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={paymentType === 'dp'}
                onClick={() => setPaymentType('dp')}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition',
                  paymentType === 'dp'
                    ? 'border-gold-600 bg-gold-50/70 ring-2 ring-gold-200'
                    : 'border-line bg-surface hover:border-gold-400',
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                    <Banknote className="h-4 w-4 text-gold-700" aria-hidden="true" />
                    DP 50%
                  </span>
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border',
                      paymentType === 'dp'
                        ? 'border-gold-600 bg-gold-600 text-surface'
                        : 'border-line-strong',
                    )}
                  >
                    {paymentType === 'dp' && <Check className="h-2.5 w-2.5" aria-hidden="true" />}
                  </span>
                </div>
                <CurrencyText
                  value={Math.floor(draft.totalAmount / 2)}
                  className="text-base font-extrabold text-ink"
                />
                <p className="text-xs leading-relaxed text-fg-muted">
                  Pelunasan sisa 50% wajib dilakukan <strong>H-1 jam / 30 menit sebelum main</strong>.
                </p>
              </button>
            </div>

            {paymentType === 'dp' ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-gold-300 bg-gold-50/80 p-3 text-xs text-gold-900">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden="true" />
                <p className="leading-relaxed">
                  <strong>Catatan DP 50%:</strong> Sisa pembayaran sebesar{' '}
                  <strong>Rp {remainingAmount.toLocaleString('id-ID')}</strong> wajib dilunasi paling
                  lambat <strong>H-1 jam / 30 menit sebelum jadwal main</strong> di kasir venue.
                  Booking yang sudah dibayar <strong>tidak dapat dibatalkan</strong>.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-lg border border-primary-200 bg-primary-50/70 p-3 text-xs text-primary-900">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" aria-hidden="true" />
                <p className="leading-relaxed">
                  <strong>Catatan Full Payment:</strong> Pembayaran bersifat final,{' '}
                  <strong>tidak dapat dibatalkan</strong>, dan{' '}
                  <strong>tidak ada pengembalian dana</strong> setelah pembayaran berhasil.
                </p>
              </div>
            )}
          </Card>

          {/* Payment Terms Accordion */}
          <Card padding="none" className="overflow-hidden">
            <button
              type="button"
              aria-expanded={policyOpen}
              onClick={() => setPolicyOpen((prev) => !prev)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-ink hover:bg-surface-alt/50"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary-700" aria-hidden="true" />
                Ketentuan Pembayaran &amp; Booking
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-fg-muted transition-transform',
                  policyOpen && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </button>
            {policyOpen && (
              <div className="space-y-2 border-t border-line px-5 py-4 text-xs leading-relaxed text-fg-muted">
                <p>&bull; Booking yang sudah dibayar <strong>tidak dapat dibatalkan</strong> dan <strong>tidak ada pengembalian dana</strong>.</p>
                <p>&bull; Untuk opsi <strong>DP 50%</strong>, pelunasan sisa 50% wajib dilakukan paling lambat <strong>H-1 jam / 30 menit sebelum jadwal main</strong>.</p>
                <p>&bull; Batas waktu menyelesaikan pembayaran online adalah <strong>15 menit</strong> setelah booking dibuat.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sticky Payment Confirmation Panel */}
        <aside className="lg:col-span-5">
          <Card padding="md" className="space-y-4 lg:sticky lg:top-20">
            <h2 className="font-display text-lg font-bold text-ink">Ringkasan Pembayaran</h2>

            <div className="space-y-2 border-y border-line py-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Total Harga ({draft.slots.length} slot)</span>
                <CurrencyText value={draft.totalAmount} className="font-semibold text-ink" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-fg-muted">Skema Dipilih</span>
                <span className="font-semibold text-ink">
                  {paymentType === 'dp' ? 'DP 50%' : 'Full Payment (100%)'}
                </span>
              </div>
              {paymentType === 'dp' && (
                <div className="flex items-center justify-between text-xs text-fg-muted">
                  <span>Sisa Pelunasan (H-1 jam / 30 mnt)</span>
                  <CurrencyText value={remainingAmount} className="font-semibold text-ink" />
                </div>
              )}
              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <span className="font-semibold text-ink">Bayar Sekarang</span>
                <CurrencyText value={payAmount} className="text-xl font-bold text-primary-900" />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-fg">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line-strong text-primary-700"
              />
              <span>
                Saya menyetujui rincian jadwal, ketentuan bahwa booking tidak dapat dibatalkan / tidak
                ada pengembalian dana, serta batas pelunasan DP jika memilih DP 50%.
              </span>
            </label>

            <Button
              fullWidth
              variant="accent"
              size="lg"
              disabled={!agreed}
              loading={createBooking.isPending}
              onClick={handleConfirm}
            >
              {paymentType === 'dp' ? 'Bayar DP 50% Sekarang' : 'Buat Booking & Bayar Penuh'}
            </Button>
          </Card>
        </aside>
      </div>

      {/* Mobile Sticky Confirm Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
        <div className="flex w-full items-center justify-between gap-3">
          <div>
            <p className="text-xs text-fg-muted">
              {paymentType === 'dp' ? 'Bayar DP 50%' : 'Total Bayar'}
            </p>
            <CurrencyText value={payAmount} className="text-base font-bold text-ink" />
          </div>
          <Button
            variant="accent"
            disabled={!agreed}
            loading={createBooking.isPending}
            onClick={handleConfirm}
          >
            Bayar Sekarang
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage
