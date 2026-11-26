import { useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import heroArenaImg from '@/assets/hero-arena.jpg'
import promoArenaImg from '@/assets/promo-arena.jpg'
import { PATHS } from '@/app/router/paths'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared'
import { Button, Input, Select } from '@/components/ui'
import { FieldCard, useFields } from '@/features/fields'
import { cn } from '@/utils/cn'

const BOOKING_STEPS = [
  {
    num: '01',
    title: 'Pilih Lapangan & Jam',
    desc: 'Periksa ketersediaan slot per jam secara real-time sesuai tanggal main.',
  },
  {
    num: '02',
    title: 'Selesaikan Pembayaran',
    desc: 'Slot terkunci otomatis selama 15 menit untuk pembayaran via QRIS atau Virtual Account.',
  },
  {
    num: '03',
    title: 'Check-in di Venue',
    desc: 'Tunjukkan kode booking Anda di meja resepsionis Noel Futsal sebelum sesi dimulai.',
  },
]

const VENUE_HIGHLIGHTS = [
  'Rumput sintetis & vinyl futsal berstandar kompetisi',
  'Lampu stadion LED merata untuk sesi malam bebas silau',
  'Ruang ganti bersih, musholla, kantin, dan parkir luas',
]

const FAQS = [
  {
    q: 'Bagaimana jika hujan deras saat jadwal di lapangan outdoor?',
    a: 'Pengelola Noel Futsal menyediakan opsi penjadwalan ulang (reschedule) ke slot pengganti atau pemindahan ke lapangan indoor apabila tersedia.',
  },
  {
    q: 'Berapa lama batas waktu menyelesaikan pembayaran?',
    a: 'Batas pembayaran adalah 15 menit setelah booking dibuat. Jika melewati batas waktu, slot akan terbuka kembali secara otomatis.',
  },
  {
    q: 'Apakah bisa memesan beberapa jam berturut-turut?',
    a: 'Bisa. Anda dapat memilih beberapa slot jam yang berurutan dalam satu transaksi.',
  },
  {
    q: 'Metode pembayaran apa saja yang didukung?',
    a: 'Pembayaran online mendukung QRIS, Virtual Account bank, dan e-wallet melalui Midtrans, serta pembayaran tunai langsung melalui petugas kasir.',
  },
]

const EASE_OUT = [0.22, 1, 0.36, 1] as const

export function HomePage() {
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [format, setFormat] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const popularQuery = useFields({ sort: 'popular', limit: 6 })
  const popularFields = popularQuery.data?.items ?? []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (format) params.set('surface_type', format)
    const query = params.toString()
    navigate(query ? `${PATHS.FIELDS}?${query}` : PATHS.FIELDS)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-bg">
        {/* Full-Width Centered Sporty Banner Hero */}
        <section className="relative flex min-h-[540px] items-center justify-center overflow-hidden bg-primary-950 py-16 text-surface sm:min-h-[600px] sm:py-24">
          <img
            src={heroArenaImg}
            alt="Banner arena lapangan Noel Futsal"
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-primary-950/75"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-950/50 via-transparent to-primary-950/90"
          />

          <div className="relative z-10 w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
              className="mx-auto max-w-3xl text-center"
            >
              <h1 className="font-display text-4xl font-bold tracking-tight text-surface sm:text-5xl lg:text-6xl lg:leading-[1.08]">
                Booking Lapangan.{' '}
                <span className="text-gold-400">Langsung Kick-Off.</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-primary-100 sm:text-base">
                Cek jadwal kosong Noel Futsal secara real-time, kunci slot tim Anda dalam hitungan
                detik, dan langsung main tanpa antre.
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08, ease: EASE_OUT }}
              onSubmit={handleSearch}
              className="mx-auto mt-8 max-w-4xl rounded-xl border border-gold-400/25 bg-surface/95 p-4 text-left text-fg shadow-2xl backdrop-blur-md sm:p-5"
            >
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
                <div className="space-y-1.5 lg:col-span-4">
                  <label htmlFor="hero-date" className="block text-xs font-semibold text-fg-muted">
                    Tanggal Main
                  </label>
                  <Input id="hero-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-1.5 lg:col-span-4">
                  <label htmlFor="hero-format" className="block text-xs font-semibold text-fg-muted">
                    Jenis Permukaan
                  </label>
                  <Select
                    id="hero-format"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    options={[
                      { value: '', label: 'Semua Jenis' },
                      { value: 'Rumput Sintetis', label: 'Rumput Sintetis' },
                      { value: 'Vinyl', label: 'Vinyl' },
                      { value: 'Interlock', label: 'Interlock' },
                    ]}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <Button type="submit" variant="accent" fullWidth className="h-10 font-bold">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    <span>Cari Jadwal</span>
                  </Button>
                </div>
              </div>
            </motion.form>
          </div>
        </section>

        {/* Field Catalog Preview */}
        <section className="w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-10 xl:px-14 2xl:px-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="border-l-4 border-gold-500 pl-3.5">
              <p className="font-mono text-[11px] font-bold tracking-widest text-primary-700 uppercase">
                Arena Pilihan
              </p>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Pilihan Lapangan Noel Futsal
              </h2>
              <p className="mt-1 text-sm text-fg-muted">
                Pilih lapangan untuk melihat fasilitas lengkap dan slot jam yang tersedia.
              </p>
            </div>
            <Link
              to={PATHS.FIELDS}
              className="group inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-primary-800 transition hover:border-primary-300 hover:bg-primary-50"
            >
              <span>Lihat Semua</span>
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>

          <div className="mt-7">
            {popularQuery.isLoading ? (
              <LoadingState variant="cards" count={3} label="Memuat daftar lapangan..." />
            ) : popularQuery.isError ? (
              <ErrorState
                message="Gagal memuat daftar lapangan."
                onRetry={() => void popularQuery.refetch()}
              />
            ) : popularFields.length === 0 ? (
              <EmptyState
                title="Belum ada lapangan tersedia"
                description="Lapangan akan tampil di sini setelah diaktifkan oleh pengelola."
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {popularFields.map((field) => (
                  <FieldCard key={field.id} field={field} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Visual Venue Showcase Banner */}
        <section className="w-full px-4 pb-12 sm:px-6 sm:pb-16 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid overflow-hidden rounded-2xl border border-primary-800/40 bg-primary-950 text-surface shadow-lg lg:grid-cols-12">
            <div className="relative min-h-[240px] sm:min-h-[300px] lg:col-span-6">
              <img
                src={promoArenaImg}
                alt="Gawang dan rumput lapangan di bawah lampu stadion malam"
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary-950/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-primary-950"
              />
            </div>

            <div className="flex flex-col justify-center space-y-5 p-6 sm:p-10 lg:col-span-6">
              <div className="space-y-2">
                <span className="inline-block rounded-sm bg-gold-500/15 px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-gold-300 uppercase">
                  Standar Arena
                </span>
                <h2 className="font-display text-2xl font-bold tracking-tight text-surface sm:text-3xl">
                  Siap Main Pagi hingga Malam
                </h2>
                <p className="text-sm leading-relaxed text-primary-100">
                  Nikmati kualitas rumput dan pencahayaan stadion yang terawat untuk pertandingan
                  rutin komunitas, sparing tim, maupun turnamen kantor.
                </p>
              </div>

              <ul className="space-y-2.5 text-sm text-primary-100">
                {VENUE_HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-gold-300">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-1">
                <Button asChild variant="accent" size="md" className="font-bold">
                  <Link to={PATHS.FIELDS}>Lihat Jadwal Tersedia</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Sporty 3-Step Flow */}
        <section className="border-y border-line bg-surface py-12 sm:py-14">
          <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
            <div className="border-l-4 border-primary-800 pl-3.5">
              <p className="font-mono text-[11px] font-bold tracking-widest text-primary-700 uppercase">
                Cara Booking
              </p>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                3 Langkah Menuju Lapangan
              </h2>
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-3 sm:gap-6">
              {BOOKING_STEPS.map((step) => (
                <div
                  key={step.title}
                  className="rounded-xl border border-line bg-surface-alt p-5 transition hover:border-primary-300 hover:shadow-xs"
                >
                  <span className="font-mono text-2xl font-bold text-gold-600">{step.num}</span>
                  <h3 className="mt-2 font-display text-base font-bold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Clean Hairline FAQ */}
        <section className="w-full px-4 py-12 sm:px-6 sm:py-16 lg:px-10 xl:px-14 2xl:px-16">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="border-l-4 border-gold-500 pl-3.5">
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                  Pertanyaan Umum
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                Informasi singkat mengenai batas pembayaran, reschedule cuaca, dan metode transaksi.
              </p>
            </div>

            <div className="divide-y divide-line border-y border-line lg:col-span-8">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-ink transition-colors hover:text-primary-800"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200',
                          isOpen && 'rotate-180',
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: EASE_OUT }}
                          className="overflow-hidden"
                        >
                          <p className="pb-4 text-sm leading-relaxed text-fg-muted">{item.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </div>
    </MotionConfig>
  )
}

export default HomePage
