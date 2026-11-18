import { useState } from 'react'
import {
  CalendarCheck,
  ChevronDown,
  Clock,
  CreditCard,
  HelpCircle,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { Badge, Button, Card, CardBody } from '@/components/ui'
import { cn } from '@/utils/cn'

type FaqCategory = 'semua' | 'pemesanan' | 'pembayaran' | 'refund' | 'venue'

interface FaqItem {
  id: string
  category: Exclude<FaqCategory, 'semua'>
  question: string
  answer: string
}

const BOOKING_STEPS = [
  {
    step: '01',
    title: 'Pilih Lapangan & Tanggal',
    description: 'Buka menu Lapangan, filter jenis rumput atau fasilitas, lalu tentukan tanggal main.',
    icon: MapPin,
  },
  {
    step: '02',
    title: 'Pilih Slot Jam Bermain',
    description: 'Klik satu atau beberapa slot jam berurutan yang berstatus Tersedia pada jadwal.',
    icon: Clock,
  },
  {
    step: '03',
    title: 'Bayar Secara Instan',
    description: 'Selesaikan pembayaran via Midtrans (VA, QRIS, E-Wallet) sebelum batas waktu berakhir.',
    icon: CreditCard,
  },
  {
    step: '04',
    title: 'Check-In di Arena',
    description: 'Tunjukkan kode booking di meja kasir minimal 15 menit sebelum jadwal pertandingan.',
    icon: CalendarCheck,
  },
] as const

const FAQ_CATEGORIES: Array<{ id: FaqCategory; label: string }> = [
  { id: 'semua', label: 'Semua Topik' },
  { id: 'pemesanan', label: 'Pemesanan' },
  { id: 'pembayaran', label: 'Pembayaran' },
  { id: 'refund', label: 'Pembatalan & Refund' },
  { id: 'venue', label: 'Aturan Venue' },
]

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'multi-slot',
    category: 'pemesanan',
    question: 'Apakah saya bisa memesan lebih dari 1 jam sekaligus?',
    answer:
      'Ya, Anda dapat memilih beberapa slot jam yang berurutan pada tanggal dan lapangan yang sama sebelum melanjutkan ke halaman checkout.',
  },
  {
    id: 'offline-booking',
    category: 'pemesanan',
    question: 'Apakah tersedia pemesanan langsung di lokasi (offline)?',
    answer:
      'Tersedia. Anda dapat datang langsung ke meja kasir Noel Futsal untuk melakukan booking offline dengan pembayaran tunai atau transfer sesuai ketersediaan slot.',
  },
  {
    id: 'payment-methods',
    category: 'pembayaran',
    question: 'Metode pembayaran apa saja yang didukung?',
    answer:
      'Pembayaran online diproses melalui Midtrans yang mendukung Virtual Account (BCA, BNI, BRI, Mandiri, Permata), QRIS, serta E-Wallet. Status pembayaran akan terkonfirmasi otomatis.',
  },
  {
    id: 'payment-ttl',
    category: 'pembayaran',
    question: 'Berapa lama batas waktu untuk menyelesaikan pembayaran online?',
    answer:
      'Setelah booking dibuat, slot akan dikunci sementara sesuai batas waktu pembayaran yang tertera pada halaman checkout & countdown (umumnya 15 menit). Jika melewati batas waktu, slot otomatis terbuka kembali.',
  },
  {
    id: 'cancel-refund',
    category: 'refund',
    question: 'Bagaimana cara membatalkan booking dan mengajukan refund?',
    answer:
      'Masuk ke akun Anda lalu buka ikon History Booking di pojok kanan atas. Pilih reservasi yang ingin dibatalkan, lalu klik Batalkan Booking. Pengajuan refund akan diproses oleh admin sesuai kebijakan venue.',
  },
  {
    id: 'venue-rules',
    category: 'venue',
    question: 'Apa saja perlengkapan dan aturan saat bermain di Noel Futsal?',
    answer:
      'Pemain wajib menggunakan sepatu futsal/olahraga non-marking yang bersih, hadir minimal 15 menit sebelum jadwal, serta menjaga kebersihan dan ketertiban area lapangan.',
  },
  {
    id: 'custom-event',
    category: 'venue',
    question: 'Bagaimana jika ingin memesan untuk turnamen atau sparing rutin?',
    answer:
      'Silakan hubungi pengelola arena melalui kontak WhatsApp atau email yang tertera di halaman ini untuk penjadwalan khusus atau sewa durasi panjang.',
  },
]

export function HelpPage() {
  const [category, setCategory] = useState<FaqCategory>('semua')
  const [openId, setOpenId] = useState<string | null>(FAQ_ITEMS[0].id)

  const filteredFaqs =
    category === 'semua' ? FAQ_ITEMS : FAQ_ITEMS.filter((item) => item.category === category)

  return (
    <div className="w-full space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 xl:px-14 2xl:px-16">
      <PageHeader
        title="Pusat Bantuan & FAQ"
        subtitle="Panduan lengkap cara pemesanan lapangan, pembayaran, pembatalan, serta informasi layanan Noel Futsal."
        breadcrumbs={[{ label: 'Beranda', to: PATHS.HOME }, { label: 'Bantuan' }]}
        actions={
          <Link to={PATHS.FIELDS}>
            <Button size="sm">Cari Lapangan</Button>
          </Link>
        }
      />

      {/* Cara Booking */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Cara Booking Lapangan</h2>
            <p className="text-xs text-fg-muted sm:text-sm">
              Empat langkah cepat untuk mengamankan jadwal bertanding tim Anda.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BOOKING_STEPS.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.step} padding="md" className="flex h-full flex-col justify-between gap-3">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-950 text-gold-300">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="font-mono text-xs font-bold text-fg-muted">{item.step}</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-ink">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-fg-muted">{item.description}</p>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      {/* FAQ + Contact Sidebar */}
      <div className="grid gap-8 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary-700" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold text-ink">Pertanyaan Umum (FAQ)</h2>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                    category === cat.id
                      ? 'bg-primary-950 text-surface'
                      : 'border border-line bg-surface text-fg-muted hover:border-primary-400 hover:text-ink',
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            {filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id
              return (
                <Card key={faq.id} padding="none" className="overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-surface-alt/50"
                  >
                    <span className="font-display text-sm font-bold text-ink sm:text-base">
                      {faq.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200',
                        isOpen && 'rotate-180 text-primary-700',
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-line bg-surface-alt/40 px-5 py-3.5 text-sm leading-relaxed text-fg-muted">
                      {faq.answer}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-4">
          <Card padding="md" className="space-y-4 bg-primary-950 text-surface">
            <div className="space-y-1">
              <Badge variant="gold" size="sm">
                Layanan Pelanggan
              </Badge>
              <h3 className="font-display text-lg font-bold text-surface">Butuh Bantuan Langsung?</h3>
              <p className="text-xs leading-relaxed text-primary-200">
                Tim admin Noel Futsal siap membantu kendala pembayaran, penjadwalan ulang, atau reservasi acara.
              </p>
            </div>

            <div className="space-y-2.5 border-t border-primary-800 pt-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                <span>Operasional: Setiap Hari, 07:00 – 23:00 WIB</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                <span>WhatsApp Admin: 0812-3456-7890</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-gold-300" aria-hidden="true" />
                <span>Email: admin@noelfutsal.id</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Link to={PATHS.MY_BOOKINGS}>
                <Button fullWidth variant="accent" size="sm">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Buka History Booking
                </Button>
              </Link>
              <Link to={PATHS.FIELDS}>
                <Button
                  fullWidth
                  variant="ghost"
                  size="sm"
                  className="border border-primary-700 text-surface hover:bg-primary-900"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  Lihat Semua Lapangan
                </Button>
              </Link>
            </div>
          </Card>

          <Card>
            <CardBody className="flex items-start gap-3 text-xs">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold text-ink">Transaksi Aman &amp; Terverifikasi</p>
                <p className="leading-relaxed text-fg-muted">
                  Seluruh pembayaran online diproses melalui gateway Midtrans resmi dan tercatat otomatis di riwayat akun Anda.
                </p>
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default HelpPage
