import { useState, type ReactNode } from 'react'
import { LayoutDashboard, Menu, X } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { Badge } from '@/components/ui'
import { useAuthStore } from '@/features/auth'
import { cn } from '@/utils/cn'

export interface DashboardNavItem {
  to: string
  label: string
  icon?: ReactNode
  end?: boolean
}

export interface DashboardLayoutProps {
  panelTitle: string
  navItems: DashboardNavItem[]
  children?: ReactNode
}

export function DashboardLayout({ panelTitle, navItems, children }: DashboardLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)

  const sidebarContent = (
    <div className="flex h-full flex-col bg-primary-950 text-primary-100">
      <div className="flex h-16 items-center justify-between border-b border-primary-900 px-5">
        <Link to={PATHS.HOME} className="font-display text-lg font-bold text-surface">
          ArenaKick
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

      <div className="px-4 py-3">
        <p className="font-mono text-[11px] tracking-wider text-primary-300 uppercase">
          {panelTitle}
        </p>
      </div>

      <nav aria-label={panelTitle} className="flex-1 space-y-1 px-3 pb-6">
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
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      <aside className="hidden w-64 shrink-0 lg:block">{sidebarContent}</aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-ink/50"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] shadow-lg">{sidebarContent}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
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
            {role && (
              <Badge variant={role === 'admin' ? 'primary' : 'gold'} size="sm">
                {role.toUpperCase()}
              </Badge>
            )}
            <span className="hidden text-sm font-medium text-fg sm:inline">
              {user?.name ?? 'Pengguna'}
            </span>
            <Link
              to={PATHS.HOME}
              className="text-xs font-semibold text-primary-700 hover:underline"
            >
              Situs Publik
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children ?? <Outlet />}</main>
      </div>
    </div>
  )
}
