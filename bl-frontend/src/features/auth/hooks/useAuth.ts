import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { useToast } from '@/components/ui'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const role = useAuthStore((s) => s.role)
  const clear = useAuthStore((s) => s.clear)

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clear()
      queryClient.clear()
      toast.info('Anda telah keluar dari akun.')
      navigate(PATHS.LOGIN, { replace: true })
    },
  })

  return {
    user,
    accessToken,
    role,
    isAuthenticated: Boolean(accessToken && user),
    isAdmin: role === 'admin',
    isOwner: role === 'owner',
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  }
}

export function useRestoreSession() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setSession = useAuthStore((s) => s.setSession)
  const clear = useAuthStore((s) => s.clear)
  const [settled, setSettled] = useState(Boolean(accessToken))

  useEffect(() => {
    if (accessToken) {
      return
    }

    let cancelled = false
    authApi
      .refresh()
      .then((data) => {
        if (!cancelled) {
          setSession(data.user, data.access_token)
        }
      })
      .catch(() => {
        if (!cancelled) {
          clear()
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSettled(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, setSession, clear])

  return { isRestoring: !accessToken && !settled }
}
