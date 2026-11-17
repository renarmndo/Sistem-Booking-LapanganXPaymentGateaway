import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'

const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="bg-primary-950 text-primary-100">
      <div className="grid w-full gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-10 xl:px-14 2xl:px-16">
        <div>
          <p className="font-display text-xl font-bold text-surface">Noel Futsal</p>
          <p className="mt-3 text-sm leading-relaxed text-primary-200">
            Arena futsal Noel Futsal dengan pemesanan jadwal real-time, harga transparan, dan
            pembayaran instan.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-surface">Tentang Kami</p>
          <ul className="mt-3 space-y-2 text-sm text-primary-200">
            <li>
              <Link to={PATHS.FIELDS} className="hover:text-gold-300">
                Daftar Lapangan
              </Link>
            </li>
            <li>
              <Link to={PATHS.HELP} className="hover:text-gold-300">
                Standar Kualitas Rumput
              </Link>
            </li>
            <li>
              <Link to={PATHS.HELP} className="hover:text-gold-300">
                Bantuan &amp; FAQ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-surface">Hubungi Kami</p>
          <ul className="mt-3 space-y-2 text-sm text-primary-200">
            <li>Setiap hari, 08:00 – 23:00 WIB</li>
            <li>info@noelfutsal.id</li>
            <li className="text-xs text-primary-300">Pembayaran aman via Midtrans</li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-surface">Syarat &amp; Ketentuan</p>
          <ul className="mt-3 space-y-2 text-sm text-primary-200">
            <li>
              <Link to={PATHS.HELP} className="hover:text-gold-300">
                Ketentuan Reservasi
              </Link>
            </li>
            <li>
              <Link to={PATHS.HELP} className="hover:text-gold-300">
                Kebijakan Reschedule &amp; Refund
              </Link>
            </li>
            <li>
              <Link to={PATHS.LOGIN} className="hover:text-gold-300">
                Masuk / Daftar
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-primary-900/50 px-4 py-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs text-primary-300">
          <span>&copy; {CURRENT_YEAR} Noel Futsal. Seluruh hak cipta dilindungi.</span>
<span className="text-sm text-gold-300/80">
             FIFA Quality Pro Standard
           </span>
        </div>
      </div>
    </footer>
  )
}
