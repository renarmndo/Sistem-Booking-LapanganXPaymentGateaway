import { lazy, Suspense, type ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  MapPin,
} from 'lucide-react'
import type { RouteObject } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { DashboardLayout, type DashboardNavItem } from '@/components/layout'
import { PageLoader } from '@/components/shared'

const OwnerDashboardPage = lazy(() => import('@/features/owner/pages/OwnerDashboardPage'))
const OwnerFieldsPage = lazy(() => import('@/features/owner/pages/OwnerFieldsPage'))
const OwnerSchedulePage = lazy(() => import('@/features/owner/pages/OwnerSchedulePage'))
const OwnerReservationsPage = lazy(() => import('@/features/owner/pages/OwnerReservationsPage'))
const OwnerRevenuePage = lazy(() => import('@/features/owner/pages/OwnerRevenuePage'))
const OwnerUtilizationPage = lazy(() => import('@/features/owner/pages/OwnerUtilizationPage'))

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>
}

const OWNER_NAV_ITEMS: DashboardNavItem[] = [
  {
    to: PATHS.OWNER_DASHBOARD,
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />,
    end: true,
  },
  {
    to: PATHS.OWNER_FIELDS,
    label: 'Lapangan Saya',
    icon: <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    to: PATHS.OWNER_SCHEDULES,
    label: 'Jadwal',
    icon: <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    to: PATHS.OWNER_RESERVATIONS,
    label: 'Reservasi',
    icon: <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    to: PATHS.OWNER_REVENUE,
    label: 'Pendapatan',
    icon: <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    to: PATHS.OWNER_UTILIZATION,
    label: 'Utilisasi',
    icon: <Activity className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
]

export const ownerRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute allowedRoles={['owner']} />,
    children: [
      {
        element: <DashboardLayout panelTitle="Panel Owner Noel Futsal" navItems={OWNER_NAV_ITEMS} />,
        children: [
          {
            path: PATHS.OWNER_DASHBOARD,
            element: withSuspense(<OwnerDashboardPage />),
          },
          {
            path: PATHS.OWNER_FIELDS,
            element: withSuspense(<OwnerFieldsPage />),
          },
          {
            path: PATHS.OWNER_SCHEDULES,
            element: withSuspense(<OwnerSchedulePage />),
          },
          {
            path: PATHS.OWNER_RESERVATIONS,
            element: withSuspense(<OwnerReservationsPage />),
          },
          {
            path: PATHS.OWNER_REVENUE,
            element: withSuspense(<OwnerRevenuePage />),
          },
          {
            path: PATHS.OWNER_UTILIZATION,
            element: withSuspense(<OwnerUtilizationPage />),
          },
        ],
      },
    ],
  },
]
