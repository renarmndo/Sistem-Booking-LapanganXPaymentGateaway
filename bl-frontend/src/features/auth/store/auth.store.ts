import { create } from 'zustand'
import type { AuthUser, UserRole } from '../types/auth.types'

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  role: UserRole | null
  setSession: (user: AuthUser, accessToken: string) => void
  clear: () => void
}

/**
 * Access token is kept strictly in JS memory (never persisted to localStorage)
 * to mitigate XSS token theft; session restoration uses the HttpOnly refresh cookie.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  role: null,
  setSession: (user, accessToken) =>
    set({
      user,
      accessToken,
      role: user.role,
    }),
  clear: () =>
    set({
      user: null,
      accessToken: null,
      role: null,
    }),
}))
