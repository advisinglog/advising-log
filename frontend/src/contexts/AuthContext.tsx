// ============================================================
// AdvisingLog — Auth Context (Google OAuth & Demo Switcher)
// ============================================================

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, UserRole } from '@/types'
import { getApiBase, getSessionToken, onUnauthorized, setSession } from '@/services/apiClient'

export interface GoogleLoginResult {
  success: boolean
  user?: User
  error?: string
  message?: string
  email?: string
}

interface AuthState {
  currentUser: User | null
  isAuthenticated: boolean
  /** Sign in with a Google OAuth access token; the backend verifies it with Google */
  loginWithGoogle: (accessToken: string) => Promise<GoogleLoginResult>
  logout: () => void
  /** Switch active role for users with multi-role permissions */
  switchRole?: (role: UserRole) => boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('advising_log_auth_user')
    // A saved profile without a server session (e.g. from before server-verified sign-in) is not trusted
    if (saved && !getSessionToken()) {
      localStorage.removeItem('advising_log_auth_user')
      return null
    }
    if (saved) {
      try {
        const u = JSON.parse(saved)
        if (u && (u.email?.toLowerCase() === 'se.advisinglog@gmail.com' || u.code === 'ADM-SUPER')) {
          if (!u.baseRole) u.baseRole = 'super_admin'
          if (!u.role) u.role = 'super_admin'
          if (u.name === 'System Admin' || u.name === 'System Super Admin' || u.name === 'System Super Admin (SE AdvisingLog)') {
            u.name = 'Super Admin'
          }
          localStorage.setItem('advising_log_auth_user', JSON.stringify(u))
        } else if (u && !u.baseRole) {
          u.baseRole = u.role
          localStorage.setItem('advising_log_auth_user', JSON.stringify(u))
        }
        return u
      } catch { }
    }
    return null
  })

  // Keep the API client's active role in sync (restored sessions included)
  useEffect(() => {
    if (currentUser && getSessionToken()) setSession(getSessionToken(), currentUser.role)
  }, [currentUser])

  const logout = useCallback(() => {
    setCurrentUser(null)
    localStorage.removeItem('advising_log_auth_user')
    setSession(null)
  }, [])

  // Server rejected the session (expired, deactivated): sign out
  useEffect(() => onUnauthorized(logout), [logout])

  const loginWithGoogle = useCallback(async (accessToken: string): Promise<GoogleLoginResult> => {
    try {
      const res = await fetch(`${getApiBase()}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const data = await res.json() as { success: boolean; user?: User; token?: string; error?: string; message?: string; email?: string }
      if (res.ok && data.success && data.user && data.token) {
        const userWithBase: User = {
          ...data.user,
          baseRole: data.user.baseRole || data.user.role,
        }
        setSession(data.token, userWithBase.role)
        setCurrentUser(userWithBase)
        localStorage.setItem('advising_log_auth_user', JSON.stringify(userWithBase))
        return { success: true, user: userWithBase }
      }
      return { success: false, error: data.error || 'AUTH_FAILED', message: data.message, email: data.email }
    } catch {
      // No client-side fallback: sign-in must always be verified by the server
      return {
        success: false,
        error: 'SERVER_UNREACHABLE',
        message: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง (Could not reach the server. Please try again.)',
      }
    }
  }, [])

  const switchRole = useCallback((newRole: UserRole): boolean => {
    let updated: User | null = null
    setCurrentUser(prev => {
      if (!prev) return null
      updated = {
        ...prev,
        baseRole: prev.baseRole || prev.role,
        role: newRole,
      }
      localStorage.setItem('advising_log_auth_user', JSON.stringify(updated))
      return updated
    })
    // The server checks this role against the account's allowed roles on every request
    if (updated) setSession(getSessionToken(), newRole)
    return Boolean(updated)
  }, [])

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: currentUser !== null,
      loginWithGoogle,
      logout,
      switchRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
