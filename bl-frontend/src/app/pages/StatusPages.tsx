import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { Button } from '@/components/ui'

interface StatusPageProps {
  code: '403' | '404' | '500'
  title: string
  description: string
  action?: ReactNode
}

function StatusPage({ code, title, description, action }: StatusPageProps) {
  return (
    <main className="pattern-stripes relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-surface">
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

      <div className="relative z-10 max-w-md rounded-xl border border-surface/15 bg-primary-950/90 p-8 text-center shadow-lg backdrop-blur-sm">
        <p className="font-mono text-sm font-semibold tracking-widest text-gold-300">
          KODE {code}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-surface">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-primary-100">{description}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action ?? (
            <Link to={PATHS.HOME}>
              <Button variant="accent">Kembali ke Beranda</Button>
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}

export function ForbiddenPage() {
  return (
    <StatusPage
      code="403"
      title="Akses Ditolak"
      description="Anda tidak memiliki izin untuk membuka halaman ini. Silakan kembali ke beranda atau masuk dengan akun yang sesuai."
    />
  )
}

export function NotFoundPage() {
  return (
    <StatusPage
      code="404"
      title="Halaman Tidak Ditemukan"
      description="Halaman yang Anda cari mungkin telah dipindahkan atau alamat URL tidak tersedia."
    />
  )
}

export function ServerErrorPage({ onRetry }: { onRetry?: () => void }) {
  return (
    <StatusPage
      code="500"
      title="Terjadi Gangguan Sistem"
      description="Maaf, sistem mengalami kendala tak terduga. Silakan muat ulang halaman atau kembali ke beranda."
      action={
        <>
          {onRetry && (
            <Button variant="accent" onClick={onRetry}>
              Muat Ulang
            </Button>
          )}
          <Link to={PATHS.HOME}>
            <Button variant="secondary">Kembali ke Beranda</Button>
          </Link>
        </>
      }
    />
  )
}
