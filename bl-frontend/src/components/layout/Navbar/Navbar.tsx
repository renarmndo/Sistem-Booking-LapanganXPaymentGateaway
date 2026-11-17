import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

export interface NavbarProps {
  transparentOverHero?: boolean
  isAuthenticated?: boolean
  userName?: string
  dashboardPath?: string | null
  onLogout?: () => void
}

const NAV_LINKS = [
  { to: PATHS.HOME, label: 'Beranda' },
  { to: PATHS.FIELDS, label: 'Lapangan' },
  { to: PATHS.HELP, label: 'Bantuan' },
]

export function Navbar({
  transparentOverHero = false,
  isAuthenticated = false,
  userName,
  dashboardPath,
  onLogout,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isTransparent = transparentOverHero && !scrolled && !menuOpen

  return (
    <header
      className={cn(
        'z-40 w-full transition-colors duration-200',
        transparentOverHero ? 'fixed inset-x-0 top-0' : 'sticky top-0',
        isTransparent
          ? 'border-b border-transparent bg-transparent text-surface'
          : 'border-b border-line bg-surface/95 text-fg shadow-xs backdrop-blur-sm',
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
        <Link
          to={PATHS.HOME}
          className={cn(
            'flex items-center gap-2 font-display text-xl font-bold tracking-tight',
            isTransparent ? 'text-surface' : 'text-primary-950',
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-sm text-xs font-bold',
              isTransparent ? 'bg-gold-500 text-ink' : 'bg-primary-950 text-gold-300',
            )}
          >
            P
          </span>
          <span>Pitch &amp; Co.</span>
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === PATHS.HOME}
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors',
                  isTransparent
                    ? isActive
                      ? 'text-gold-300'
                      : 'text-surface/85 hover:text-surface'
                    : isActive
                      ? 'text-primary-700'
                      : 'text-fg-muted hover:text-fg',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isAuthenticated && (
            <NavLink
              to={PATHS.MY_BOOKINGS}
              className={({ isActive }) =>
                cn(
                  'text-sm font-medium transition-colors',
                  isTransparent
                    ? isActive
                      ? 'text-gold-300'
                      : 'text-surface/85 hover:text-surface'
                    : isActive
                      ? 'text-primary-700'
                      : 'text-fg-muted hover:text-fg',
                )
              }
            >
              Booking Saya
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          {isAuthenticated ? (
            <>
              {dashboardPath && (
                <Link to={dashboardPath}>
                  <Button variant="secondary" size="sm">
                    Dashboard
                  </Button>
                </Link>
              )}
              <Link to={PATHS.ACCOUNT}>
                <Button variant={isTransparent ? 'accent' : 'primary'} size="sm">
                  {userName ? userName.split(' ')[0] : 'Akun'}
                </Button>
              </Link>
              {onLogout && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className={isTransparent ? 'text-surface hover:bg-surface/10' : undefined}
                >
                  Keluar
                </Button>
              )}
            </>
          ) : (
            <>
              <Link to={PATHS.LOGIN}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={isTransparent ? 'text-surface hover:bg-surface/10' : undefined}
                >
                  Masuk
                </Button>
              </Link>
              <Link to={PATHS.REGISTER}>
                <Button variant={isTransparent ? 'accent' : 'primary'} size="sm">
                  Daftar
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-md md:hidden',
            isTransparent ? 'text-surface hover:bg-surface/10' : 'text-fg hover:bg-surface-alt',
          )}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-line bg-surface px-4 py-4 text-fg md:hidden">
          <nav aria-label="Menu mobile" className="flex flex-col gap-2">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === PATHS.HOME}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-fg hover:bg-surface-alt',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 border-t border-line pt-3">
              {isAuthenticated ? (
                <Link to={PATHS.ACCOUNT} className="w-full" onClick={() => setMenuOpen(false)}>
                  <Button fullWidth size="sm">
                    {userName ? `Akun (${userName.split(' ')[0]})` : 'Akun Saya'}
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to={PATHS.LOGIN} className="flex-1" onClick={() => setMenuOpen(false)}>
                    <Button variant="secondary" fullWidth size="sm">
                      Masuk
                    </Button>
                  </Link>
                  <Link to={PATHS.REGISTER} className="flex-1" onClick={() => setMenuOpen(false)}>
                    <Button fullWidth size="sm">
                      Daftar
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
