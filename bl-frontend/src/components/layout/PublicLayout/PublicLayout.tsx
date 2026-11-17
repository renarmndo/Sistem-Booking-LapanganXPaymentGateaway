import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { useAuth } from '@/features/auth'
import { BottomNav } from '../BottomNav'
import { Footer } from '../Footer'
import { Navbar } from '../Navbar'

export interface PublicLayoutProps {
  transparentOverHero?: boolean
  showBottomNav?: boolean
  children?: ReactNode
}

export function PublicLayout({
  transparentOverHero = false,
  showBottomNav = true,
  children,
}: PublicLayoutProps) {
  const { user, isAuthenticated, role, logout } = useAuth()

  const dashboardPath =
    role === 'admin'
      ? PATHS.ADMIN_DASHBOARD
      : role === 'owner'
        ? PATHS.OWNER_DASHBOARD
        : null

  return (
    <div className="flex min-h-screen flex-col bg-bg text-fg">
      <Navbar
        transparentOverHero={transparentOverHero}
        isAuthenticated={isAuthenticated}
        userName={user?.name}
        dashboardPath={dashboardPath}
        onLogout={logout}
      />
      <div className="flex-1 pb-16 md:pb-0">{children ?? <Outlet />}</div>
      <Footer />
      {showBottomNav && <BottomNav />}
    </div>
  )
}
