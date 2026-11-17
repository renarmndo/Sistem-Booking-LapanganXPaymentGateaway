import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { DashboardLayout, type DashboardNavItem } from '@/components/layout'
import { PageLoader } from '@/components/shared'

const PlaceholderPage = lazy(() => import('@/app/pages/PlaceholderPage'))

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>
}

const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
  { to: PATHS.ADMIN_DASHBOARD, label: 'Dashboard', end: true },
  { to: PATHS.ADMIN_FIELDS, label: 'Lapangan' },
  { to: PATHS.ADMIN_SCHEDULES, label: 'Jadwal & Blokir' },
  { to: PATHS.ADMIN_BOOKINGS, label: 'Booking' },
  { to: PATHS.ADMIN_USERS, label: 'Pelanggan' },
  { to: PATHS.ADMIN_TRANSACTIONS, label: 'Transaksi' },
  { to: PATHS.ADMIN_REFUNDS, label: 'Refund' },
  { to: PATHS.ADMIN_SETTINGS, label: 'Pengaturan' },
]

export const adminRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      {
        element: <DashboardLayout panelTitle="Panel Admin" navItems={ADMIN_NAV_ITEMS} />,
        children: [
          {
            path: PATHS.ADMIN_DASHBOARD,
            element: withSuspense(<PlaceholderPage title="Dashboard Admin" />),
          },
          {
            path: PATHS.ADMIN_FIELDS,
            element: withSuspense(<PlaceholderPage title="Manajemen Lapangan" />),
          },
          {
            path: PATHS.ADMIN_SCHEDULES,
            element: withSuspense(<PlaceholderPage title="Jadwal & Blokir Slot" />),
          },
          {
            path: PATHS.ADMIN_BOOKINGS,
            element: withSuspense(<PlaceholderPage title="Daftar Booking" />),
          },
          {
            path: PATHS.ADMIN_OFFLINE_BOOKING,
            element: withSuspense(<PlaceholderPage title="Booking Offline" />),
          },
          {
            path: PATHS.ADMIN_USERS,
            element: withSuspense(<PlaceholderPage title="Pelanggan" />),
          },
          {
            path: PATHS.ADMIN_TRANSACTIONS,
            element: withSuspense(<PlaceholderPage title="Transaksi" />),
          },
          {
            path: PATHS.ADMIN_REFUNDS,
            element: withSuspense(<PlaceholderPage title="Permintaan Refund" />),
          },
          {
            path: PATHS.ADMIN_SETTINGS,
            element: withSuspense(<PlaceholderPage title="Pengaturan" />),
          },
        ],
      },
    ],
  },
]
