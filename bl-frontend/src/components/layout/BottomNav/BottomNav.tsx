import { CalendarCheck2, Home, Search, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { cn } from '@/utils/cn'

const ITEMS = [
  { to: PATHS.HOME, label: 'Beranda', icon: Home },
  { to: PATHS.FIELDS, label: 'Lapangan', icon: Search },
  { to: PATHS.MY_BOOKINGS, label: 'Booking', icon: CalendarCheck2 },
  { to: PATHS.ACCOUNT, label: 'Akun', icon: User },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Navigasi bawah"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:hidden"
    >
      <div className="grid h-16 grid-cols-4">
        {ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === PATHS.HOME}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-primary-700' : 'text-fg-muted hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 rounded-full bg-gold-500"
                    />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
