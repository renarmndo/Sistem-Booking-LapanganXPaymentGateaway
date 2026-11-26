import { useEffect, useState } from 'react'
import { History, LogOut, Menu, User, X } from 'lucide-react'
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
          ? 'text-surface border-b border-transparent bg-transparent'
          : 'border-line bg-surface/95 text-fg border-b shadow-xs backdrop-blur-sm',
      )}
    >
      <div className="flex h-14 w-full items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
        <Link
          to={PATHS.HOME}
          className={cn(
            'font-display flex items-center gap-2 text-xl font-bold tracking-tight',
            isTransparent ? 'text-surface' : 'text-primary-950',
          )}
        >
          <span>Noel Futsal</span>
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
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              {dashboardPath && (
                <Link to={dashboardPath}>
                  <Button variant="secondary" size="sm">
                    Dashboard
                  </Button>
                </Link>
              )}
              <Link
                to={PATHS.MY_BOOKINGS}
                aria-label="History Booking"
                title="History Booking"
                className={cn(
                  'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
                  isTransparent
                    ? 'border-surface/25 bg-surface/10 text-surface hover:bg-surface/20'
                    : 'border-line bg-surface text-fg hover:bg-surface-alt hover:text-primary-700',
                )}
              >
                <History className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to={PATHS.ACCOUNT} title="Profil Akun">
                <Button variant={isTransparent ? 'accent' : 'primary'} size="sm">
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span>{userName ? userName.split(' ')[0] : 'Akun'}</span>
                </Button>
              </Link>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Keluar"
                  title="Keluar"
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
                    isTransparent
                      ? 'border-surface/25 bg-surface/10 text-surface hover:bg-surface/20'
                      : 'border-line bg-surface text-fg-muted hover:bg-danger-soft hover:text-danger',
                  )}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
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
        <div className="border-line bg-surface text-fg border-t px-4 py-4 md:hidden">
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
            {isAuthenticated && (
              <NavLink
                to={PATHS.MY_BOOKINGS}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-primary-50 text-primary-700' : 'text-fg hover:bg-surface-alt',
                  )
                }
              >
                History Booking
              </NavLink>
            )}
            <div className="border-line mt-2 flex gap-2 border-t pt-3">
              {isAuthenticated ? (
                <div className="flex w-full items-center gap-2">
                  <Link to={PATHS.ACCOUNT} className="flex-1" onClick={() => setMenuOpen(false)}>
                    <Button fullWidth size="sm">
                      <User className="h-4 w-4" aria-hidden="true" />
                      <span>{userName ? userName.split(' ')[0] : 'Akun Saya'}</span>
                    </Button>
                  </Link>
                  {onLogout && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setMenuOpen(false)
                        onLogout()
                      }}
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>Keluar</span>
                    </Button>
                  )}
                </div>
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
