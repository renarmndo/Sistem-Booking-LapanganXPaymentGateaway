import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { Badge, Button } from '@/components/ui'
import { useAuth } from '@/features/auth'
import { cn } from '@/utils/cn'

export interface DashboardNavItem {
  to: string
  label: string
  icon?: ReactNode
  end?: boolean
  badge?: number
}

export interface DashboardLayoutProps {
  panelTitle: string
  navItems: DashboardNavItem[]
  children?: ReactNode
}

export function DashboardLayout({ panelTitle, navItems, children }: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const { user, role, logout, isLoggingOut } = useAuth()
  const userInitial = (user?.name?.trim()?.[0] ?? 'N').toUpperCase()
  const roleLabel = role === 'admin' ? 'Petugas' : role === 'owner' ? 'Owner' : role?.toUpperCase()

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawerOpen])

  const sidebarContent = (
    <div className="flex h-full flex-col bg-primary-950 text-primary-100">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-primary-900 px-5">
        <Link to={PATHS.HOME} className="font-display text-lg font-bold text-surface">
          Noel Futsal
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Tutup menu sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-md text-primary-200 hover:bg-primary-900 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="shrink-0 px-4 py-3">
        <p className="text-xs font-medium text-primary-300">{panelTitle}</p>
      </div>

      <nav
        aria-label={panelTitle}
        className="flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 pb-6"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setDrawerOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-l-[3px] border-gold-500 bg-primary-900 text-surface'
                  : 'text-primary-200 hover:bg-primary-900/60 hover:text-surface',
              )
            }
          >
            {item.icon ?? <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant="warning" size="sm">
                {item.badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-fg">
      <aside className="hidden h-full w-64 shrink-0 border-r border-primary-900 lg:block">
        {sidebarContent}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-ink/50"
          />
          <aside className="relative z-10 h-full w-64 max-w-[80vw] shadow-lg">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu sidebar"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-fg hover:bg-surface-alt lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-ink">{panelTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface-alt/70 py-1 pr-3 pl-1.5">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-900 text-xs font-bold text-surface"
              >
                {userInitial}
              </span>
              <span className="hidden text-sm font-semibold text-ink sm:inline">
                {user?.name ?? 'Pengguna'}
              </span>
              {roleLabel && (
                <Badge variant={role === 'admin' ? 'primary' : 'gold'} size="sm">
                  {roleLabel}
                </Badge>
              )}
            </div>

            <span aria-hidden="true" className="hidden h-5 w-px bg-line sm:block" />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={isLoggingOut}
              onClick={logout}
              aria-label="Keluar dari akun"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  )
}
