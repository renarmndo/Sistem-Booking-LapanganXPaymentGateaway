import { lazy, Suspense, type ReactNode } from 'react'
import type { RouteObject } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { PublicLayout } from '@/components/layout'
import { PageLoader } from '@/components/shared'

const AccountPage = lazy(() => import('@/features/auth/pages/AccountPage'))
const CheckoutPage = lazy(() => import('@/features/booking/pages/CheckoutPage'))
const PaymentStatusPage = lazy(() => import('@/features/booking/pages/PaymentStatusPage'))
const MyBookingsPage = lazy(() => import('@/features/booking/pages/MyBookingsPage'))
const BookingDetailPage = lazy(() => import('@/features/booking/pages/BookingDetailPage'))

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
            element: withSuspense(<CheckoutPage />),
          },
          {
            path: PATHS.PAYMENT_STATUS(),
            element: withSuspense(<PaymentStatusPage />),
          },
          {
            path: PATHS.MY_BOOKINGS,
            element: withSuspense(<MyBookingsPage />),
          },
          {
            path: PATHS.BOOKING_DETAIL(),
            element: withSuspense(<BookingDetailPage />),
          },
          {
            path: PATHS.ACCOUNT,
            element: withSuspense(<AccountPage />),
          },
        ],
      },
    ],
  },
]
