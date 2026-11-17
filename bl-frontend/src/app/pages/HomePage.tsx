import { useState } from 'react'
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Clock,
  CreditCard,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { EmptyState, ErrorState, LoadingState } from '@/components/shared'
import { Button, Card, Input, PitchPattern, Select } from '@/components/ui'
import { FieldCard, useFields } from '@/features/fields'
import { cn } from '@/utils/cn'

const STATS = [
  { value: '120+', label: 'SLOT TERSEDIA / MINGGU', sub: 'Jadwal fleksibel pagi hingga malam' },
  { value: '6.8k+', label: 'PERTANDINGAN SUKSES', sub: 'Komunitas & tim korporat aktif' },
  { value: '99.8%', label: 'AKURASI SLOT REAL-TIME', sub: 'Anti double-booking otomatis' },
  { value: '4.9/5', label: 'RATING KEPUASAN', sub: 'Dari ulasan kapten tim terverifikasi' },
]

const STEPS = [
  {
    num: '01',
    title: 'Pilih Lapangan',
    desc: 'Bandingkan jenis rumput, kapasitas pemain, dan fasilitas pendukung arena kami.',
    icon: Search,
  },
  {
    num: '02',
    title: 'Cek Slot Real-Time',
    desc: 'Lihat jadwal kosong per jam dan kunci slot secara otomatis selama batas pembayaran.',
    icon: Clock,
  },
  {
    num: '03',
    title: 'Bayar Instan & Otomatis',
    desc: 'Selesaikan pembayaran via QRIS, Virtual Account, atau e-wallet melalui Midtrans.',
    icon: CreditCard,
  },
  {
    num: '04',
    title: 'Langsung Main di Venue',
    desc: 'Tunjukkan kode booking Anda di meja resepsionis dan langsung masuk ke lapangan.',
    icon: Trophy,
  },
]

const BENEFITS = [
  {
    title: 'Bebas Risiko Bentrok Jadwal',
    desc: 'Sistem penguncian slot otomatis memastikan jam yang sedang Anda bayar tidak dapat dipesan tim lain.',
    icon: ShieldCheck,
  },
  {
    title: 'Standar Kualitas Terinspeksi',
    desc: 'Perawatan rumput rutin, pencahayaan malam merata, serta ruang ganti bersih sebelum setiap sesi.',
    icon: Sparkles,
  },
  {
    title: 'Kebijakan Pembatalan Jelas',
    desc: 'Transparansi penuh untuk aturan reschedule dan pengembalian dana sesuai sisa waktu sebelum main.',
    icon: Calendar,
  },
]

const FAQS = [
  {
    q: 'Bagaimana jika terjadi hujan deras saat jadwal di lapangan outdoor?',
    a: 'Untuk kondisi cuaca ekstrem yang membuat lapangan tidak layak pakai, tim pengelola menyediakan opsi reschedule ke jadwal pengganti atau pemindahan ke lapangan indoor bila tersedia.',
  },
  {
    q: 'Berapa lama batas waktu untuk menyelesaikan pembayaran?',
    a: 'Setelah slot dipilih dan booking dibuat, Anda memiliki waktu 15 menit untuk menyelesaikan pembayaran sebelum slot dilepas kembali secara otomatis.',
  },
  {
    q: 'Apakah bisa memesan beberapa jam berturut-turut?',
    a: 'Bisa. Anda dapat memilih beberapa slot jam yang berurutan dalam satu transaksi booking.',
  },
  {
    q: 'Metode pembayaran apa saja yang tersedia?',
    a: 'Kami mendukung pembayaran online melalui Midtrans (QRIS, Virtual Account bank, dan e-wallet) serta pencatatan pembayaran tunai melalui admin.',
  },
]

export function HomePage() {
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('19:00')
  const [format, setFormat] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const popularQuery = useFields({ sort: 'popular', limit: 6 })
  const popularFields = popularQuery.data?.items ?? []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (date) params.set('date', date)
    if (startTime) params.set('time', startTime)
    if (format) params.set('surface_type', format)
    const query = params.toString()
    navigate(query ? `${PATHS.FIELDS}?${query}` : PATHS.FIELDS)
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="pattern-stripes relative overflow-hidden pt-24 pb-16 text-surface sm:pt-32 sm:pb-24">
        <svg
          viewBox="0 0 800 500"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.08"
          strokeWidth="1.5"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover text-surface"
        >
          <rect x="20" y="20" width="760" height="460" rx="4" />
          <line x1="400" y1="20" x2="400" y2="480" />
          <circle cx="400" cy="250" r="70" />
          <rect x="20" y="150" width="120" height="200" />
          <rect x="660" y="150" width="120" height="200" />
        </svg>

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center rounded-full border border-gold-300/40 bg-primary-900/70 px-3.5 py-1 font-mono text-[11px] font-semibold tracking-widest text-gold-300 uppercase">
            Premier Football Reservation
          </span>

          <h1 className="mx-auto mt-5 max-w-3xl font-display text-display-xl font-bold text-surface">
            Booking Lapangan Bola,{' '}
            <span className="text-gold-300">Semudah Satu Ketukan</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-primary-100 sm:text-base">
            Arena sepak bola &amp; mini soccer berstandar FIFA dengan jadwal real-time, kunci slot
            otomatis, dan pembayaran instan tanpa antre.
          </p>

          {/* Search Card (Single Venue — tanpa filter Lokasi) */}
          <form
            onSubmit={handleSearch}
            className="mx-auto mt-8 max-w-4xl rounded-xl border border-line bg-surface p-3 text-left text-fg shadow-lg sm:p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <div className="space-y-1">
                <label htmlFor="hero-date" className="block font-mono text-[11px] font-semibold text-fg-muted uppercase">
                  Tanggal Main
                </label>
                <Input
                  id="hero-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="hero-time" className="block font-mono text-[11px] font-semibold text-fg-muted uppercase">
                  Waktu Mulai
                </label>
                <Select
                  id="hero-time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  options={[
                    { value: '07:00', label: '07:00 WIB (Pagi)' },
                    { value: '16:00', label: '16:00 WIB (Sore)' },
                    { value: '19:00', label: '19:00 WIB (Prime)' },
                    { value: '21:00', label: '21:00 WIB (Malam)' },
                  ]}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="hero-format" className="block font-mono text-[11px] font-semibold text-fg-muted uppercase">
                  Jenis Lapangan
                </label>
                <Select
                  id="hero-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  options={[
                    { value: '', label: 'Semua Jenis Rumput' },
                    { value: 'Sintetis', label: 'Rumput Sintetis' },
                    { value: 'Alami', label: 'Rumput Alami' },
                  ]}
                />
              </div>

              <Button type="submit" variant="accent" fullWidth className="h-11 md:h-10">
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>Cari Jadwal</span>
              </Button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-primary-200">
            <span>Slot Real-Time Akurat</span>
            <span aria-hidden="true">•</span>
            <span>Konfirmasi Otomatis via Midtrans</span>
            <span aria-hidden="true">•</span>
            <span>Fasilitas Ruang Ganti &amp; Lampu Pro</span>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="pattern-dots border-b border-line bg-bg py-10">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          {STATS.map((stat) => (
            <Card key={stat.label} padding="sm" className="text-center">
              <p className="font-display text-3xl font-bold text-ink">{stat.value}</p>
              <p className="mt-1 font-mono text-[11px] font-semibold tracking-wider text-primary-700 uppercase">
                {stat.label}
              </p>
              <p className="mt-1 text-xs text-fg-muted">{stat.sub}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Fields */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold tracking-widest text-gold-600 uppercase">
              Arena Terbaik Kami
            </p>
            <h2 className="mt-1 font-display text-display-lg font-bold text-ink">
              Pilihan Lapangan Unggulan
            </h2>
          </div>
          <Link
            to={PATHS.FIELDS}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-800 hover:text-primary-600"
          >
            <span>Lihat Semua Lapangan</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8">
          {popularQuery.isLoading ? (
            <LoadingState variant="cards" count={3} label="Memuat lapangan populer..." />
          ) : popularQuery.isError ? (
            <ErrorState
              message="Gagal memuat daftar lapangan populer."
              onRetry={() => void popularQuery.refetch()}
            />
          ) : popularFields.length === 0 ? (
            <EmptyState
              title="Belum ada lapangan tersedia"
              description="Data lapangan akan segera ditampilkan setelah ditambahkan admin."
            />
          ) : (
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:pb-0">
              {popularFields.map((field, index) => (
                <FieldCard
                  key={field.id}
                  field={field}
                  badgeLabel={index === 0 ? 'POPULER' : undefined}
                  className="w-[82vw] max-w-sm shrink-0 snap-start md:w-auto md:max-w-none"
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4 Steps */}
      <section className="border-y border-line bg-surface-alt/60 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <p className="font-mono text-xs font-semibold tracking-widest text-gold-600 uppercase">
              Proses Cepat &amp; Transparan
            </p>
            <h2 className="mt-1 font-display text-display-lg font-bold text-ink">
              4 Langkah Memulai Laga Anda
            </h2>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <Card key={step.num} padding="md">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-primary-950 font-mono text-xs font-bold text-gold-300">
                      {step.num}
                    </span>
                    <Icon className="h-5 w-5 text-primary-700" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{step.desc}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Why Us */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="space-y-4 lg:col-span-5">
            <p className="font-mono text-xs font-semibold tracking-widest text-gold-600 uppercase">
              Kenapa Kami
            </p>
            <h2 className="font-display text-display-lg font-bold text-ink">
              Dirancang Khusus untuk Pengalaman Bertanding Tanpa Kompromi
            </h2>
            <p className="text-sm leading-relaxed text-fg-muted">
              Mulai dari kepastian jadwal hingga kualitas rumput dan pencahayaan, setiap detail
              dikelola untuk kenyamanan tim Anda.
            </p>
            <div className="rounded-md border border-gold-300 bg-gold-50 p-3.5 text-xs text-ink">
              <strong className="font-semibold">Jaminan Ketersediaan Slot 100%:</strong> jadwal yang
              terkonfirmasi terkunci langsung di sistem kami.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
            {BENEFITS.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.title} padding="md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary-800">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{item.desc}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-surface-alt/50 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <p className="font-mono text-xs font-semibold tracking-widest text-gold-600 uppercase">
              Informasi Lengkap
            </p>
            <h2 className="mt-1 font-display text-display-lg font-bold text-ink">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <div className="mt-8 space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <Card key={item.q} padding="none" className="overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-ink hover:bg-surface-alt/60"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-fg-muted transition-transform',
                        isOpen && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line px-5 py-3.5 text-sm leading-relaxed text-fg-muted">
                      {item.a}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <PitchPattern
          variant="lines"
          className="rounded-xl px-6 py-12 text-center text-surface shadow-md sm:px-12"
        >
          <p className="font-mono text-xs font-semibold tracking-widest text-gold-300 uppercase">
            Siap Berlaga?
          </p>
          <h2 className="mx-auto mt-2 max-w-xl font-display text-display-lg font-bold text-surface">
            Siap Mengamankan Jadwal Bertanding Tim Anda?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-primary-100">
            Periksa ketersediaan jam bermain hari ini dan lakukan reservasi dalam hitungan menit.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to={PATHS.FIELDS}>
              <Button variant="accent" size="lg">
                Jelajahi Lapangan Sekarang
              </Button>
            </Link>
            <Link to={PATHS.HELP}>
              <Button
                variant="secondary"
                size="lg"
                className="border-surface/30 bg-primary-900/60 text-surface hover:bg-primary-900"
              >
                Bantuan &amp; FAQ
              </Button>
            </Link>
          </div>
        </PitchPattern>
      </section>
    </div>
  )
}

export default HomePage
