// ============================================================
// AdvisingLog — Record-level data scoping (RBAC phase 2)
// Applied to every read response so each role only receives the records it may see:
// - Student:  only their own records (+ their own advisor's profile)
// - Advisor:  only their advisees' records (+ staff profiles)
// - QA Chair: exit cases & student voice case-level (logged); everything else de-identified
// - Admin:    users & roster only (never advising records or personal notes)
// Records may reference a person by id, code or email, so matching uses all three, case-insensitively.
// ============================================================

import type { Role } from './auth'

export interface Viewer {
  role: Role
  /** The viewer's own id / code / email (normalized) */
  aliases: Set<string>
  /** Student: their advisors. Advisor: their advisees. (normalized id / code / email) */
  linkedAliases: Set<string>
  /** QA: students who have an exit case (case-level access is allowed for them) */
  exitStudentAliases: Set<string>
}

type Kind = 'users' | 'user' | 'roster' | 'record' | 'progress' | 'exit' | 'voice' | 'documents'

const SCOPED_ROUTES: Array<[RegExp, string, Kind]> = [
  [/^\/api\/users$/, 'users', 'users'],
  [/^\/api\/users\/[^/]+$/, 'user', 'user'],
  [/^\/api\/roster$/, 'roster', 'roster'],
  [/^\/api\/requests$/, 'requests', 'record'],
  [/^\/api\/appointments$/, 'appointments', 'record'],
  [/^\/api\/sessions$/, 'sessions', 'record'],
  [/^\/api\/follow-ups$/, 'followUps', 'record'],
  [/^\/api\/early-warnings$/, 'earlyWarnings', 'record'],
  [/^\/api\/follow-up-progress$/, 'progress', 'progress'],
  [/^\/api\/exit-cases$/, 'exitCases', 'exit'],
  [/^\/api\/student-voice$/, 'surveys', 'voice'],
  [/^\/api\/documents$/, 'documents', 'documents'],
]

export function scopedRoute(path: string): { key: string; kind: Kind } | null {
  for (const [re, key, kind] of SCOPED_ROUTES) {
    if (re.test(path)) return { key, kind }
  }
  return null
}

/** What the viewer's scope needs loaded from the database for this route kind */
export function scopeNeeds(role: Role, kind: Kind): { linked: boolean; exitStudents: boolean } {
  if (role === 'student') return { linked: kind === 'users' || kind === 'user', exitStudents: false }
  if (role === 'advisor') return { linked: true, exitStudents: false }
  if (role === 'qa_chair') return { linked: false, exitStudents: kind === 'users' || kind === 'user' || kind === 'documents' }
  return { linked: false, exitStudents: false }
}

export const norm = (v: unknown) => String(v ?? '').trim().toLowerCase()

export function aliasSet(...values: unknown[]): Set<string> {
  return new Set(values.map(norm).filter(Boolean))
}

const has = (set: Set<string>, v: unknown) => v != null && v !== '' && set.has(norm(v))

const userAliases = (u: any) => [u?.id, u?.code, u?.email]
const isSelfOrIn = (set: Set<string>, u: any) => userAliases(u).some(a => has(set, a))

// Fields QA may see on everyday advising records: structure, status and dates only.
// No student identity and no free text (details, notes, summaries, reasons).
const QA_SAFE_FIELDS = new Set([
  'id', 'requestId', 'appointmentId', 'sessionId', 'followUpId', 'advisorId',
  'category', 'subCategory', 'status', 'warningType', 'severity', 'riskLevel', 'progress',
  'preferredDate', 'scheduledDate', 'sessionDate', 'dueDate', 'completedAt', 'dateDetected',
  'assignedAt', 'isActive', 'pdpaConsent', 'createdAt', 'updatedAt',
])

function pick(obj: any, fields: Set<string>) {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(obj || {})) if (fields.has(k)) out[k] = obj[k]
  return out
}

/** De-identified placeholder so QA counts (e.g. students per program) still work */
function anonymousStudent(u: any, index: number) {
  return {
    id: `ANON_${index + 1}`,
    code: '',
    name: '',
    email: '',
    role: 'student',
    department: u?.department ?? '',
    isActive: u?.isActive ?? true,
    createdAt: u?.createdAt ?? '',
  }
}

function scopeList(kind: Kind, items: any[], v: Viewer): any[] {
  const isAdmin = v.role === 'admin' || v.role === 'super_admin'
  const ownsRecord = (r: any) =>
    v.role === 'student'
      ? has(v.aliases, r.studentId)
      : has(v.aliases, r.advisorId) || has(v.linkedAliases, r.studentId)

  switch (kind) {
    case 'users':
      if (isAdmin) return items
      if (v.role === 'student') return items.filter(u => isSelfOrIn(v.aliases, u) || isSelfOrIn(v.linkedAliases, u))
      if (v.role === 'advisor') return items.filter(u => u.role !== 'student' || isSelfOrIn(v.linkedAliases, u))
      // QA: staff profiles; students only when they have an exit case (C8 case-level access)
      return items.map((u, i) => {
        if (u.role !== 'student') { const { phone: _phone, ...staff } = u; return staff }
        if (isSelfOrIn(v.exitStudentAliases, u)) return { id: u.id, code: u.code, name: u.name, email: '', role: u.role, department: u.department, isActive: u.isActive, createdAt: u.createdAt }
        return anonymousStudent(u, i)
      })

    case 'roster':
      if (isAdmin) return items
      if (v.role === 'qa_chair') return items.map(r => pick(r, QA_SAFE_FIELDS))
      return items.filter(ownsRecord)

    case 'record':
    case 'progress':
      if (isAdmin) return []
      if (v.role === 'qa_chair') return items.map(r => pick(r, QA_SAFE_FIELDS))
      // Follow-up progress has no advisorId: advisors see it for their advisees
      return items.filter(ownsRecord)

    case 'exit':
      if (isAdmin) return []
      if (v.role === 'qa_chair') return items
      return items.filter(ownsRecord)

    case 'voice':
      if (isAdmin) return []
      if (v.role === 'qa_chair') return items
      if (v.role === 'student') return items.filter(r => has(v.aliases, r.studentId))
      // Advisors only see surveys their advisee chose to share
      return items.filter(r => r.shareWithAdvisor && has(v.linkedAliases, r.studentId))

    case 'documents':
      if (isAdmin) return []
      if (v.role === 'qa_chair') return items.filter(d => has(v.exitStudentAliases, d.studentId))
      return items.filter(ownsRecord)

    default:
      return []
  }
}

/**
 * Returns the response body with only what the viewer may see.
 * Single-user responses that are out of scope return null (caller responds 404).
 */
export function scopeResponse(path: string, body: any, viewer: Viewer): any {
  const route = scopedRoute(path)
  if (!route || body == null || typeof body !== 'object') return body
  const value = body[route.key]

  if (route.kind === 'user') {
    if (!value) return body
    const [scoped] = scopeList('users', [value], viewer)
    if (!scoped || (scoped as any).id?.startsWith?.('ANON_')) return null
    return { ...body, user: scoped }
  }

  if (!Array.isArray(value)) return body
  return { ...body, [route.key]: scopeList(route.kind, value, viewer) }
}
