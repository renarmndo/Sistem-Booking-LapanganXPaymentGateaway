import { lazy, Suspense, type ReactNode } from 'react'
import {
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Receipt,
  RotateCcw,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { DashboardLayout, type DashboardNavItem } from '@/components/layout'
import { PageLoader } from '@/components/shared'
import { useAdminDashboardSummary } from '@/features/admin/hooks/useAdminOps'

const AdminDashboardPage = lazy(() => import('@/features/admin/dashboard/pages/AdminDashboardPage'))
const AdminFieldsPage = lazy(() => import('@/features/admin/pages/AdminFieldsPage'))
const AdminFacilitiesPage = lazy(() => import('@/features/admin/pages/AdminFacilitiesPage'))
const AdminSchedulesPage = lazy(() => import('@/features/admin/schedules/pages/AdminSchedulesPage'))
const AdminBookingsPage = lazy(() => import('@/features/admin/bookings/pages/AdminBookingsPage'))
const AdminOfflineBookingPage = lazy(
  () => import('@/features/admin/bookings/pages/AdminOfflineBookingPage'),
)
const AdminUsersPage = lazy(() => import('@/features/admin/users/pages/AdminUsersPage'))
const AdminTransactionsPage = lazy(
  () => import('@/features/admin/transactions/pages/AdminTransactionsPage'),
)
const AdminRefundsPage = lazy(() => import('@/features/admin/refunds/pages/AdminRefundsPage'))
const AdminSettingsPage = lazy(() => import('@/features/admin/settings/pages/AdminSettingsPage'))

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>
}

export function AdminDashboardShell() {
  const summaryQuery = useAdminDashboardSummary()
  const needsReviewCount = summaryQuery.data?.needs_review_count ?? 0

  const navItems: DashboardNavItem[] = [
    {
      to: PATHS.ADMIN_DASHBOARD,
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />,
      end: true,
    },
    {
      to: PATHS.ADMIN_FIELDS,
      label: 'Lapangan',
      icon: <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      to: PATHS.ADMIN_FACILITIES,
      label: 'Fasilitas',
      icon: <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      to: PATHS.ADMIN_SCHEDULES,
      label: 'Jadwal & Blokir',
      icon: <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      to: PATHS.ADMIN_BOOKINGS,
      label: 'Daftar Booking',
      icon: <ClipboardList className="h-4 w-4 shrink-0" aria-hidden="true" />,
      end: true,
    },
    {
      to: PATHS.ADMIN_OFFLINE_BOOKING,
      label: 'Booking Offline',
      icon: <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      to: PATHS.ADMIN_USERS,
      label: 'Pelanggan & Akun',
      icon: <Users className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      to: PATHS.ADMIN_TRANSACTIONS,
      label: 'Transaksi',
      icon: <Receipt className="h-4 w-4 shrink-0" aria-hidden="true" />,
      badge: needsReviewCount,
    },
    {
      to: PATHS.ADMIN_REFUNDS,
      label: 'Refund',
      icon: <RotateCcw className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      to: PATHS.ADMIN_SETTINGS,
      label: 'Pengaturan',
      icon: <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
  ]

  return <DashboardLayout panelTitle="Panel Petugas Noel Futsal" navItems={navItems} />
}

export const adminRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      {
        element: <AdminDashboardShell />,
        children: [
          {
            path: PATHS.ADMIN_DASHBOARD,
            element: withSuspense(<AdminDashboardPage />),
          },
          {
            path: PATHS.ADMIN_FIELDS,
            element: withSuspense(<AdminFieldsPage />),
          },
          {
            path: PATHS.ADMIN_FIELD_NEW,
            element: <Navigate to={PATHS.ADMIN_FIELDS} replace />,
          },
          {
            path: PATHS.ADMIN_FIELD_EDIT(),
            element: <Navigate to={PATHS.ADMIN_FIELDS} replace />,
          },
          {
            path: PATHS.ADMIN_FACILITIES,
            element: withSuspense(<AdminFacilitiesPage />),
          },
          {
            path: PATHS.ADMIN_SCHEDULES,
            element: withSuspense(<AdminSchedulesPage />),
          },
          {
            path: PATHS.ADMIN_BOOKINGS,
            element: withSuspense(<AdminBookingsPage />),
          },
          {
            path: PATHS.ADMIN_OFFLINE_BOOKING,
            element: withSuspense(<AdminOfflineBookingPage />),
          },
          {
            path: PATHS.ADMIN_USERS,
            element: withSuspense(<AdminUsersPage />),
          },
          {
            path: PATHS.ADMIN_TRANSACTIONS,
            element: withSuspense(<AdminTransactionsPage />),
          },
          {
            path: PATHS.ADMIN_REFUNDS,
            element: withSuspense(<AdminRefundsPage />),
          },
          {
            path: PATHS.ADMIN_SETTINGS,
            element: withSuspense(<AdminSettingsPage />),
          },
        ],
      },
    ],
  },
]
