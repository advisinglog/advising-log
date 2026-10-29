import type { User, UserRole } from '@/types'

export interface RoleMeta {
  role: UserRole
  labelTh: string
  labelEn: string
  shortLabelTh: string
  shortLabelEn: string
  descTh: string
  descEn: string
  defaultPath: string
  badgeClass: string
  activeCardClass: string
}

export const ROLE_CONFIGS: Record<UserRole, RoleMeta> = {
  student: {
    role: 'student',
    labelTh: 'นักศึกษา',
    labelEn: 'Student',
    shortLabelTh: 'นศ.',
    shortLabelEn: 'Student',
    descTh: 'จองนัดหมาย, ส่งคำร้อง, ติดตามผล',
    descEn: 'Request advising, track appointments, follow-ups',
    defaultPath: '/student',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    activeCardClass: 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-500/20',
  },
  advisor: {
    role: 'advisor',
    labelTh: 'อาจารย์ที่ปรึกษา',
    labelEn: 'Academic Advisor',
    shortLabelTh: 'อาจารย์ที่ปรึกษา',
    shortLabelEn: 'Advisor',
    descTh: 'ดูแลนักศึกษาในความดูแล, จัดการนัดหมาย, บันทึก Log',
    descEn: 'Supervise advisees, manage appointments, log meetings',
    defaultPath: '/advisor',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    activeCardClass: 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/30 ring-1 ring-sky-500/20',
  },
  qa_chair: {
    role: 'qa_chair',
    labelTh: 'ประธานหลักสูตร / QA',
    labelEn: 'Program Chair / QA',
    shortLabelTh: 'ประธาน / QA',
    shortLabelEn: 'Chair / QA',
    descTh: 'ทบทวนเคสลาออก, วิเคราะห์ AI, ประกันคุณภาพหลักสูตร',
    descEn: 'Review exit cases, AI qualitative insights, QA metrics',
    defaultPath: '/qa',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
    activeCardClass: 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 ring-1 ring-indigo-500/20',
  },
  admin: {
    role: 'admin',
    labelTh: 'ผู้ดูแลระบบ',
    labelEn: 'Administrator',
    shortLabelTh: 'ผู้ดูแลระบบ',
    shortLabelEn: 'Admin',
    descTh: 'จัดการผู้ใช้งาน, ตารางจัดสรร นศ., กำหนดหมวดหมู่',
    descEn: 'Manage users, student-advisor roster, categories',
    defaultPath: '/admin',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    activeCardClass: 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-1 ring-amber-500/20',
  },
  super_admin: {
    role: 'super_admin',
    labelTh: 'ผู้ดูแลระบบระดับสูง',
    labelEn: 'Super Administrator',
    shortLabelTh: 'Super Admin',
    shortLabelEn: 'Super Admin',
    descTh: 'สิทธิ์ระบบสูงสุด, กำกับดูแลระบบ AI Governance',
    descEn: 'Full system privileges & AI Governance control',
    defaultPath: '/admin',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    activeCardClass: 'border-purple-500 bg-purple-50/70 dark:bg-purple-950/30 ring-1 ring-purple-500/20',
  },
}

/**
 * Returns available switchable roles for a given user.
 * - Faculty / Advisors / QA can toggle between Advisor and QA roles
 * - Admins can switch between Admin, QA, and Advisor
 * - Super Admins can switch between Super Admin, Admin, QA, and Advisor
 * - Students can only use the student role
 */
export function getAvailableRolesForUser(user: User | null): UserRole[] {
  if (!user) return []

  if (user.roles && user.roles.length > 1) {
    return user.roles
  }

  const base = user.baseRole || user.role

  if (base === 'student') {
    return ['student']
  }

  if (base === 'advisor' || base === 'qa_chair') {
    return ['advisor', 'qa_chair']
  }

  if (base === 'admin') {
    return ['admin', 'qa_chair', 'advisor']
  }

  if (base === 'super_admin') {
    return ['super_admin', 'admin', 'qa_chair', 'advisor']
  }

  return [user.role]
}

export function getRoleDefaultPath(role: UserRole): string {
  return ROLE_CONFIGS[role]?.defaultPath || '/'
}

