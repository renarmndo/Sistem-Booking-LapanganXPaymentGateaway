import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'

const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="border-t border-primary-900 bg-primary-950 text-primary-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div>
          <p className="font-display text-xl font-bold text-surface">Pitch &amp; Co.</p>
          <p className="mt-3 text-sm leading-relaxed text-primary-200">
            Pengalaman reservasi lapangan sepak bola &amp; mini soccer berstandar pro dengan jadwal
            real-time dan pembayaran instan.
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
            <li>Setiap hari, 06:00 – 23:00 WIB</li>
            <li>concierge@pitchandco.id</li>
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

      <div className="border-t border-primary-900 px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 text-xs text-primary-300 sm:px-6">
          <span>&copy; {CURRENT_YEAR} Pitch &amp; Co. Seluruh hak cipta dilindungi.</span>
          <span className="font-mono tracking-wider uppercase text-gold-300/80">
            FIFA Quality Pro Standard
          </span>
        </div>
      </div>
    </footer>
  )
}
