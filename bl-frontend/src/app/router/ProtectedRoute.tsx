import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ForbiddenPage } from '@/app/pages/StatusPages'
import { PATHS } from '@/app/router/paths'
import { useAuthStore, type UserRole } from '@/features/auth'

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children?: ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const role = useAuthStore((s) => s.role)

  if (!accessToken || !user) {
    return <Navigate to={PATHS.LOGIN} state={{ from: location }} replace />
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <ForbiddenPage />
  }

  return <>{children ?? <Outlet />}</>
}
