import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui'
import { queryKeys } from '@/constants/queryKeys'
import { getErrorMessage } from '@/utils/error'
import { authApi } from '../api/auth.api'
import { useAuthStore } from '../store/auth.store'
import type { ChangePasswordRequest, UpdateProfileRequest } from '../types/auth.types'

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => authApi.me(),
    enabled: Boolean(accessToken),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const accessToken = useAuthStore((s) => s.accessToken)
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => authApi.updateProfile(payload),
    onSuccess: (updatedUser) => {
      if (accessToken) {
        setSession(updatedUser, accessToken)
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      toast.success('Profil berhasil diperbarui.')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useChangePassword() {
  const toast = useToast()

  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => authApi.changePassword(payload),
    onSuccess: () => {
      toast.success('Password berhasil diubah.')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}
