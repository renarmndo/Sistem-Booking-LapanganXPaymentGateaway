import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { useToast } from '@/components/ui'
import { queryKeys } from '@/constants/queryKeys'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import type { LoginRequest, UserRole } from '../types/auth.types'

interface LocationState {
  from?: {
    pathname?: string
    search?: string
  }
}

export function getRedirectPathForRole(role: UserRole, from?: LocationState['from']): string {
  if (role === 'admin') return PATHS.ADMIN_DASHBOARD
  if (role === 'owner') return PATHS.OWNER_DASHBOARD
  if (from?.pathname && from.pathname !== PATHS.LOGIN && from.pathname !== PATHS.REGISTER) {
    return `${from.pathname}${from.search ?? ''}`
  }
  return PATHS.HOME
}

export function useLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: (payload: LoginRequest) => authApi.login(payload),
    onSuccess: (data) => {
      setSession(data.user, data.access_token)
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      toast.success('Selamat datang kembali!', 'Login Berhasil')

      const state = location.state as LocationState | null
      const target = getRedirectPathForRole(data.user.role, state?.from)
      navigate(target, { replace: true })
    },
  })
}
