import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { PublicLayout } from '@/components/layout'
import { PageLoader } from '@/components/shared'

const PlaceholderPage = lazy(() => import('@/app/pages/PlaceholderPage'))

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>
}

export const userRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute allowedRoles={['user', 'admin']} />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            path: PATHS.CHECKOUT,
            element: withSuspense(<PlaceholderPage title="Ringkasan & Pembayaran" />),
          },
          {
            path: PATHS.PAYMENT_STATUS(),
            element: withSuspense(<PlaceholderPage title="Status Pembayaran" />),
          },
          {
            path: PATHS.MY_BOOKINGS,
            element: withSuspense(<PlaceholderPage title="Booking Saya" />),
          },
          {
            path: PATHS.BOOKING_DETAIL(),
            element: withSuspense(<PlaceholderPage title="Detail Booking" />),
          },
          {
            path: PATHS.ACCOUNT,
            element: withSuspense(<PlaceholderPage title="Profil Akun" />),
          },
        ],
      },
    ],
  },
]
