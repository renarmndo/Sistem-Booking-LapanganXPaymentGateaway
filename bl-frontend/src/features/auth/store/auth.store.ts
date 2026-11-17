import { create } from 'zustand'
import type { AuthUser, UserRole } from '../types/auth.types'

const SESSION_HINT_KEY = 'bl_has_session'

function setSessionHint(hasSession: boolean): void {
  if (typeof window === 'undefined') return
  try {
    if (hasSession) {
      window.localStorage.setItem(SESSION_HINT_KEY, '1')
    } else {
      window.localStorage.removeItem(SESSION_HINT_KEY)
    }
  } catch {
    // Ignore storage access errors in restricted environments.
  }
}

export function hasSessionHint(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SESSION_HINT_KEY) === '1'
  } catch {
    return false
  }
}

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
  setSession: (user, accessToken) => {
    setSessionHint(true)
    set({
      user,
      accessToken,
      role: user.role,
    })
  },
  clear: () => {
    setSessionHint(false)
    set({
      user: null,
      accessToken: null,
      role: null,
    })
  },
}))
