import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { adminRoutes } from './routes.admin'
import { ownerRoutes } from './routes.owner'
import { publicRoutes } from './routes.public'
import { userRoutes } from './routes.user'

export const appRoutes: RouteObject[] = [
  ...userRoutes,
  ...adminRoutes,
  ...ownerRoutes,
  ...publicRoutes,
]

const router = createBrowserRouter(appRoutes)

export function AppRouter() {
  return <RouterProvider router={router} />
}
