export type UserRole = 'admin' | 'user' | 'owner'

export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED'

export interface AuthUser {
  id: number
  name: string
  email: string
  phone: string
  role: UserRole
  verification_status: VerificationStatus
}

export interface AuthTokensResponse {
  access_token: string
  expires_in: number
  user: AuthUser
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  phone: string
  password: string
}

export interface VerifyOTPRequest {
  email: string
  otp: string
}

export interface ResendOTPRequest {
  email: string
}

export interface UpdateProfileRequest {
  name: string
  phone: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}
