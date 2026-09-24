// ============================================================
// AdvisingLog — Auth Context (Google OAuth & Demo Switcher)
// ============================================================

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User } from '@/types'
import { mockUsers, mockRoster } from '@/data/mock-data'
import { getLocalDateString } from '@/utils/dateUtils'

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
  /** Returns true on success, false if userId not found */
  login: (userId: string, _password?: string) => boolean
  /** Login with Google ID Token credential */
  loginWithGoogle: (credential: string) => Promise<GoogleLoginResult>
  logout: () => void
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
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    return null
  })

  const login = useCallback((userId: string, _password?: string): boolean => {
    const user = mockUsers.find(u => u.id === userId.toUpperCase())
    if (user) {
      setCurrentUser(user)
      localStorage.setItem('advising_log_auth_user', JSON.stringify(user))
      return true
    }
    return false
  }, [])

  const loginWithGoogle = useCallback(async (credential: string): Promise<GoogleLoginResult> => {
    try {
      // 1. Call Backend Hono API (Cloudflare Workers)
      const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8787'
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      })

      const data = await res.json() as { success: boolean; user?: User; error?: string; message?: string; email?: string }
      if (res.ok && data.success && data.user) {
        setCurrentUser(data.user)
        localStorage.setItem('advising_log_auth_user', JSON.stringify(data.user))
        return { success: true, user: data.user }
      } else if (data.message || data.error) {
        return { success: false, error: data.error, message: data.message, email: data.email }
      }
    } catch (_err) {
      // Backend offline fallback: Decode client-side directly
    }

    try {
      const parts = credential.split('.')
      if (parts.length >= 2) {
        const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const decoded = JSON.parse(atob(payloadBase64))
        const email = (decoded.email || '').toLowerCase().trim()
        const superAdminEmail = ((import.meta.env.VITE_SUPER_ADMIN_EMAIL as string) || 'se.advisinglog@gmail.com').toLowerCase().trim()
        const isAuthorizedAdmin = email === superAdminEmail
        const name = decoded.name || 'Google User'
        const googleId = decoded.sub || `${Date.now()}`
        const picture = decoded.picture || null

        const userCode = isAuthorizedAdmin ? 'ADM-SUPER' : email.split('@')[0].toUpperCase()

        // 1. Check if user is pre-registered in the system
        const existingUser = mockUsers.find(u => u.email.toLowerCase() === email || u.code.toUpperCase() === userCode)

        // 2. Domain & Whitelist Validation
        const isMfuDomain =
          email.endsWith('@mfu.ac.th') ||
          email.endsWith('@student.mfu.ac.th') ||
          email.endsWith('@lamduan.mfu.ac.th') ||
          email.endsWith('@lamduan.ac.th')

        if (!existingUser && !isAuthorizedAdmin) {
          if (!isMfuDomain) {
            return {
              success: false,
              error: 'DOMAIN_RESTRICTED',
              message: 'ไม่อนุญาตให้เข้าใช้งาน: กรุณาใช้อีเมลมหาวิทยาลัยแม่ฟ้าหลวง (@mfu.ac.th หรือ @lamduan.mfu.ac.th) หรือให้ผู้ดูแลระบบลงทะเบียนอีเมลภายนอกของคุณเข้าสู่ระบบก่อน',
            }
          }
          return {
            success: false,
            error: 'USER_NOT_REGISTERED',
            message: `ไม่สามารถเข้าสู่ระบบได้: บัญชีของคุณ (${email}) ยังไม่ได้รับการเพิ่มหรือลงทะเบียนโดยผู้ดูแลระบบ (Admin) กรุณาติดต่อสำนักวิชาหรือผู้ดูแลระบบเพื่อเพิ่มรายชื่อเข้าสู่ระบบ`,
            email,
          }
        }

        // Deactivation check
        if (existingUser && !existingUser.isActive) {
          return {
            success: false,
            error: 'ACCOUNT_DEACTIVATED',
            message: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ',
          }
        }

        let role: User['role'] = existingUser ? existingUser.role : (isAuthorizedAdmin ? 'admin' : 'advisor')

        // 3. Student Advisee Check: Student MUST be assigned to an advisor
        if (role === 'student') {
          const studentId = existingUser ? existingUser.id : userCode
          const hasRosterAssignment = mockRoster.some(r => (r.studentId === studentId || r.studentId === userCode) && r.isActive)
          if (!hasRosterAssignment) {
            return {
              success: false,
              error: 'STUDENT_NOT_ASSIGNED',
              message: `ไม่สามารถเข้าสู่ระบบได้: รหัสนักศึกษา ${userCode} ยังไม่ได้รับการจัดสรรอาจารย์ที่ปรึกษา กรุณาติดต่ออาจารย์ที่ปรึกษาหรือสำนักวิชาเพื่อเพิ่มรายชื่อเข้าสู่ระบบ`,
            }
          }
        }

        const newUser: User = existingUser ? {
          ...existingUser,
          name: (existingUser.name.startsWith('Student ') || existingUser.name.includes('@') || existingUser.name === userCode) && name ? name : existingUser.name,
          code: isAuthorizedAdmin ? 'ADM-SUPER' : existingUser.code,
          avatar: picture || existingUser.avatar,
        } : {
          id: isAuthorizedAdmin ? 'ADM_SE_GOOGLE' : `${role === 'student' ? 'STU' : role === 'admin' ? 'ADM' : role === 'qa_chair' ? 'QA' : 'ADV'}_${googleId.substring(0, 6)}`,
          code: userCode,
          name: isAuthorizedAdmin ? 'System Admin (SE AdvisingLog)' : name,
          email,
          role,
          department: isAuthorizedAdmin ? 'Academic Affairs (SE Admin)' : 'School of Applied Digital Technology (ADT)',
          avatar: picture,
          isActive: true,
          hasAiAccess: true,
          createdAt: getLocalDateString(),
        }

        setCurrentUser(newUser)
        localStorage.setItem('advising_log_auth_user', JSON.stringify(newUser))
        return { success: true, user: newUser }
      }
    } catch {}

    return { success: false, error: 'AUTH_FAILED', message: 'การเข้าสู่ระบบด้วย Google ล้มเหลว กรุณาลองใหม่อีกครั้ง' }
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(null)
    localStorage.removeItem('advising_log_auth_user')
  }, [])

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated: currentUser !== null,
      login,
      loginWithGoogle,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
