import { http } from '@/lib/axios'
import type { ApiResponse } from '@/types/api.types'
import type {
  AuthTokensResponse,
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendOTPRequest,
  UpdateProfileRequest,
  VerifyOTPRequest,
} from '../types/auth.types'

export const authApi = {
  async login(payload: LoginRequest): Promise<AuthTokensResponse> {
    const { data } = await http.post<ApiResponse<AuthTokensResponse>>('/auth/login', payload)
    return data.data
  },

  async register(payload: RegisterRequest): Promise<AuthUser> {
    const { data } = await http.post<ApiResponse<AuthUser>>('/auth/register', payload)
    return data.data
  },

  async verifyOtp(payload: VerifyOTPRequest): Promise<void> {
    await http.post<ApiResponse<null>>('/auth/verify-otp', payload)
  },

  async resendOtp(payload: ResendOTPRequest): Promise<void> {
    await http.post<ApiResponse<null>>('/auth/resend-otp', payload)
  },

  async refresh(): Promise<AuthTokensResponse> {
    const { data } = await http.post<ApiResponse<AuthTokensResponse>>('/auth/refresh')
    return data.data
  },

  async logout(): Promise<void> {
    await http.post<ApiResponse<null>>('/auth/logout')
  },

  async me(): Promise<AuthUser> {
    const { data } = await http.get<ApiResponse<AuthUser>>('/auth/me')
    return data.data
  },

  async updateProfile(payload: UpdateProfileRequest): Promise<AuthUser> {
    const { data } = await http.put<ApiResponse<AuthUser>>('/users/me', payload)
    return data.data
  },

  async changePassword(payload: ChangePasswordRequest): Promise<void> {
    await http.put<ApiResponse<null>>('/users/me/password', payload)
  },
}
