export { authApi } from './api/auth.api'
export { useAuth, useRestoreSession } from './hooks/useAuth'
export { useLogin } from './hooks/useLogin'
export { useChangePassword, useMe, useUpdateProfile } from './hooks/useProfile'
export { useRegister, useResendOtp, useVerifyOtp } from './hooks/useRegister'
export { useAuthStore } from './store/auth.store'
export type {
  AuthTokensResponse,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendOTPRequest,
  UpdateProfileRequest,
  UserRole,
  VerificationStatus,
  VerifyOTPRequest,
} from './types/auth.types'
