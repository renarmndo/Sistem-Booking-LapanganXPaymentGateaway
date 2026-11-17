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

const OWNER_NAV_ITEMS: DashboardNavItem[] = [
  { to: PATHS.OWNER_DASHBOARD, label: 'Dashboard', end: true },
  { to: PATHS.OWNER_FIELDS, label: 'Lapangan Saya' },
  { to: PATHS.OWNER_SCHEDULES, label: 'Jadwal' },
  { to: PATHS.OWNER_RESERVATIONS, label: 'Reservasi' },
  { to: PATHS.OWNER_REVENUE, label: 'Pendapatan' },
  { to: PATHS.OWNER_UTILIZATION, label: 'Utilisasi' },
]

export const ownerRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute allowedRoles={['owner']} />,
    children: [
      {
        element: <DashboardLayout panelTitle="Panel Pemilik" navItems={OWNER_NAV_ITEMS} />,
        children: [
          {
            path: PATHS.OWNER_DASHBOARD,
            element: withSuspense(<PlaceholderPage title="Dashboard Pemilik" />),
          },
          {
            path: PATHS.OWNER_FIELDS,
            element: withSuspense(<PlaceholderPage title="Lapangan Saya" />),
          },
          {
            path: PATHS.OWNER_SCHEDULES,
            element: withSuspense(<PlaceholderPage title="Jadwal Lapangan" />),
          },
          {
            path: PATHS.OWNER_RESERVATIONS,
            element: withSuspense(<PlaceholderPage title="Reservasi" />),
          },
          {
            path: PATHS.OWNER_REVENUE,
            element: withSuspense(<PlaceholderPage title="Laporan Pendapatan" />),
          },
          {
            path: PATHS.OWNER_UTILIZATION,
            element: withSuspense(<PlaceholderPage title="Utilisasi Lapangan" />),
          },
        ],
      },
    ],
  },
]
