import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { useToast } from '@/components/ui'
import { authApi } from '../api/auth.api'
import type { RegisterRequest, ResendOTPRequest, VerifyOTPRequest } from '../types/auth.types'

export function useRegister() {
  const toast = useToast()

  return useMutation({
    mutationFn: (payload: RegisterRequest) => authApi.register(payload),
    onSuccess: () => {
      toast.success('Kode OTP telah dikirim ke email Anda.', 'Registrasi Berhasil')
    },
  })
}

export function useVerifyOtp() {
  const navigate = useNavigate()
  const toast = useToast()

  return useMutation({
    mutationFn: (payload: VerifyOTPRequest) => authApi.verifyOtp(payload),
    onSuccess: () => {
      toast.success('Akun berhasil diverifikasi. Silakan masuk.', 'Verifikasi Berhasil')
      navigate(PATHS.LOGIN, { replace: true })
    },
  })
}

export function useResendOtp() {
  const toast = useToast()

  return useMutation({
    mutationFn: (payload: ResendOTPRequest) => authApi.resendOtp(payload),
    onSuccess: () => {
      toast.info('Kode OTP baru telah dikirim ke email Anda.')
    },
  })
}
