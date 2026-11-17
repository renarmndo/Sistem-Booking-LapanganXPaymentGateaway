import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'

export interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <aside className="pattern-stripes relative hidden flex-col justify-between overflow-hidden p-10 text-surface lg:flex">
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

        <div className="relative z-10">
          <Link to={PATHS.HOME} className="font-display text-2xl font-bold text-surface">
            Pitch &amp; Co.
          </Link>
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <p className="font-mono text-xs tracking-widest text-gold-300 uppercase">
            Booking Lapangan Sepak Bola
          </p>
          <h2 className="font-display text-3xl leading-tight font-bold text-surface">
            Jadwal Real-Time, Pembayaran Aman, Siap Kick-Off.
          </h2>
          <p className="text-sm leading-relaxed text-primary-100">
            Pilih lapangan favorit, kunci slot jam bermain secara instan, dan selesaikan
            pembayaran tanpa antre.
          </p>
        </div>

        <p className="relative z-10 text-xs text-primary-300">
          Dukungan transaksi aman &amp; verifikasi akun via OTP.
        </p>
      </aside>

      <div className="flex items-center justify-center bg-bg px-4 py-10 sm:px-8">
        <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
            <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
