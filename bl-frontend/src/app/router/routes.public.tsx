import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { ForbiddenPage, NotFoundPage, ServerErrorPage } from '@/app/pages/StatusPages'
import { PATHS } from '@/app/router/paths'
import { PublicLayout } from '@/components/layout'
import { PageLoader } from '@/components/shared'

const HelpPage = lazy(() => import('@/app/pages/HelpPage'))
const HomePage = lazy(() => import('@/app/pages/HomePage'))
const FieldDetailPage = lazy(() => import('@/app/pages/FieldDetailPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage'))
const PlaygroundPage = lazy(() =>
  import('@/app/PlaygroundPage').then((m) => ({ default: m.PlaygroundPage })),
)

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>
}

export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout transparentOverHero />,
    children: [
      {
        path: PATHS.HOME,
        element: withSuspense(<HomePage />),
      },
    ],
  },
  {
    element: <PublicLayout />,
    children: [
      {
        path: PATHS.FIELDS,
        element: <Navigate to={PATHS.HOME} replace />,
      },
      {
        path: PATHS.FIELD_DETAIL(),
        element: withSuspense(<FieldDetailPage />),
      },
      {
        path: PATHS.LOGIN,
        element: withSuspense(<LoginPage />),
      },
      {
        path: PATHS.REGISTER,
        element: withSuspense(<RegisterPage />),
      },
      {
        path: PATHS.HELP,
        element: withSuspense(<HelpPage />),
      },
    ],
  },
  ...(import.meta.env.DEV
    ? [
        {
          path: PATHS.PLAYGROUND,
          element: withSuspense(<PlaygroundPage />),
        },
      ]
    : []),
  { path: PATHS.FORBIDDEN, element: <ForbiddenPage /> },
  { path: PATHS.SERVER_ERROR, element: <ServerErrorPage /> },
  { path: '*', element: <NotFoundPage /> },
]
