import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { getDb } from './db'
import * as schema from './db/schema'
import { eq, desc, and, or } from 'drizzle-orm'
import {
  AuthError,
  allowedRolesFor,
  rolesForRoute,
  signSession,
  verifyGoogleAccessToken,
  verifySession,
  type Role,
} from './auth'
import { aliasSet, createOwnershipError, norm, ownsRecord, scopeNeeds, scopeResponse, scopedRoute, type Viewer } from './scope'

export type Bindings = {
  DB?: D1Database
  GEMINI_API_KEY?: string
  SUPER_ADMIN_EMAIL?: string
  /** Same OAuth Client ID as the frontend's VITE_GOOGLE_CLIENT_ID */
  GOOGLE_CLIENT_ID?: string
  /** Long random secret used to sign session tokens */
  SESSION_SECRET?: string
  /** Comma-separated frontend origins allowed to call the API */
  ALLOWED_ORIGINS?: string
  GOOGLE_WORKSPACE_CLIENT_ID?: string
  GOOGLE_WORKSPACE_CLIENT_SECRET?: string
  GOOGLE_WORKSPACE_REFRESH_TOKEN?: string
  GOOGLE_WORKSPACE_SENDER?: string
  /** Workers Rate Limiting bindings (wrangler.jsonc "ratelimits"); absent in unit tests */
  USER_RATE_LIMITER?: RateLimiter
  ANON_RATE_LIMITER?: RateLimiter
}

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface AuthContext {
  userId: string
  name: string
  email: string
  /** Student/staff code, when known (records may reference people by code) */
  code?: string
  baseRole: Role
  /** Active role for this request (multi-role staff can switch) */
  role: Role
}

type Variables = { auth?: AuthContext }

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

app.use('*', async (c, next) => {
  const allowed = c.env?.ALLOWED_ORIGINS
    ? c.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS
  return cors({
    origin: (origin) => (allowed.includes(origin) ? origin : null),
    allowHeaders: ['Content-Type', 'Authorization', 'x-active-role'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })(c, next)
})

/** The configured super admin's email (normalized). Only this account holds super_admin. */
function superAdminEmail(c: any): string {
  return (c.env?.SUPER_ADMIN_EMAIL || 'se.advisinglog@gmail.com').toLowerCase().trim()
}

const PUBLIC_PATHS = new Set(['/', '/api/health', '/api/info', '/api/auth/google'])

function clientIp(c: any): string {
  return c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

/** Append-only audit record (Computer Crime Act §26). Never throws. */
async function writeAudit(c: any, entry: {
  userId: string
  userName: string
  userRole: string
  action: string
  description: string
  targetId?: string | null
}) {
  const database = db(c)
  if (!database) return
  try {
    await database.insert(schema.auditLogs).values({
      id: `LOG${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      ...entry,
      targetId: entry.targetId ?? null,
      timestamp: new Date().toISOString(),
      ipAddress: clientIp(c),
    })
  } catch {}
}

/** True if the request is within the limit (or no limiter is configured) */
async function withinLimit(limiter: RateLimiter | undefined, key: string): Promise<boolean> {
  if (!limiter) return true
  try {
    return (await limiter.limit({ key })).success
  } catch {
    return true // never lock users out because the limiter itself failed
  }
}

const tooManyRequests = (c: any) => c.json({ success: false, error: 'RATE_LIMITED', message: 'Too many requests. Please wait a minute and try again.' }, 429, { 'Retry-After': '60' })

// Unauthenticated denials write at most one audit row per IP per minute, so spam
// cannot exhaust the database write quota while still leaving a trail
const lastAnonDenialLogged = new Map<string, number>()

// Every /api route except the public ones requires a valid session and an allowed role
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return next()
  if (PUBLIC_PATHS.has(c.req.path)) {
    // Sign-in calls Google and writes audit rows: limit it per IP
    if (c.req.path === '/api/auth/google' && !(await withinLimit(c.env?.ANON_RATE_LIMITER, `ip:${clientIp(c)}`))) {
      return tooManyRequests(c)
    }
    return next()
  }

  const deny = async (status: 401 | 403, error: string, auth?: Partial<AuthContext>) => {
    if (!auth?.userId) {
      const ip = clientIp(c)
      const now = Date.now()
      if ((lastAnonDenialLogged.get(ip) || 0) + 60_000 > now) return c.json({ success: false, error }, status)
      lastAnonDenialLogged.set(ip, now)
    }
    await writeAudit(c, {
      userId: auth?.userId || 'anonymous',
      userName: auth?.name || 'anonymous',
      userRole: auth?.role || 'none',
      action: 'unauthorized_access',
      description: `${error}: ${c.req.method} ${c.req.path}`,
      targetId: c.req.path,
    })
    return c.json({ success: false, error }, status)
  }

  const secret = c.env?.SESSION_SECRET
  if (!secret) return c.json({ success: false, error: 'AUTH_NOT_CONFIGURED' }, 500)

  const header = c.req.header('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const claims = token ? await verifySession(token, secret) : null
  if (!claims) {
    if (!(await withinLimit(c.env?.ANON_RATE_LIMITER, `ip:${clientIp(c)}`))) return tooManyRequests(c)
    return deny(401, 'UNAUTHENTICATED')
  }
  if (!(await withinLimit(c.env?.USER_RATE_LIMITER, `user:${claims.sub}`))) return tooManyRequests(c)

  // Re-check the account on every request so deactivation and role changes apply immediately
  let baseRole = claims.role
  let name = claims.name
  let code: string | undefined
  const database = db(c)
  if (database) {
    const user = await database.select().from(schema.users).where(eq(schema.users.id, claims.sub)).get()
    if (!user || !user.isActive) return deny(401, 'ACCOUNT_INACTIVE', { userId: claims.sub, name: claims.name })
    baseRole = user.role as Role
    name = user.name
    code = user.code
  }

  const requestedRole = (c.req.header('x-active-role') || baseRole) as Role
  const auth: AuthContext = { userId: claims.sub, name, email: claims.email, code, baseRole, role: requestedRole }
  if (!allowedRolesFor(baseRole).includes(requestedRole)) return deny(403, 'ROLE_NOT_ALLOWED', auth)

  const allowedRoles = rolesForRoute(c.req.method, c.req.path)
  if (!allowedRoles || !allowedRoles.includes(requestedRole)) return deny(403, 'FORBIDDEN', auth)

  c.set('auth', auth)
  return next()
})

// ---------------------------------------------------------------
// Audit trail for every change (Computer Crime Act §26): logged by the server,
// so it cannot be skipped or spoofed by the client
// ---------------------------------------------------------------
const AUDIT_ACTIONS: Array<[method: string, path: RegExp, action: string]> = [
  ['POST', /^\/api\/requests$/, 'request_created'],
  ['PATCH', /^\/api\/requests\/[^/]+\/status$/, 'request_updated'],
  ['DELETE', /^\/api\/requests\/[^/]+$/, 'request_deleted'],
  ['POST', /^\/api\/appointments$/, 'appointment_scheduled'],
  ['PATCH', /^\/api\/appointments\/[^/]+\/status$/, 'appointment_updated'],
  ['POST', /^\/api\/sessions$/, 'log_created'],
  ['POST', /^\/api\/follow-ups$/, 'followup_created'],
  ['PATCH', /^\/api\/follow-ups\/[^/]+\/status$/, 'followup_updated'],
  ['POST', /^\/api\/follow-up-progress$/, 'followup_progress_added'],
  ['POST', /^\/api\/exit-cases$/, 'exit_case_created'],
  ['PATCH', /^\/api\/exit-cases\/[^/]+$/, 'exit_case_updated'],
  ['POST', /^\/api\/student-voice$/, 'student_voice_submitted'],
  ['POST', /^\/api\/early-warnings$/, 'warning_created'],
  ['POST', /^\/api\/documents$/, 'document_uploaded'],
  ['DELETE', /^\/api\/documents\/[^/]+$/, 'document_deleted'],
  ['POST', /^\/api\/users$/, 'user_saved'],
  ['POST', /^\/api\/users\/bulk$/, 'users_imported'],
  ['PATCH', /^\/api\/users\/[^/]+$/, 'user_updated'],
  ['DELETE', /^\/api\/users\/[^/]+$/, 'user_deleted'],
  ['POST', /^\/api\/roster$/, 'roster_updated'],
  ['POST', /^\/api\/qa\/ai-analyze$/, 'ai_analysis_run'],
]

export function auditActionFor(method: string, path: string): string {
  for (const [m, re, action] of AUDIT_ACTIONS) if (m === method && re.test(path)) return action
  if (path.startsWith('/api/ai/keys')) return 'ai_key_changed'
  if (path.startsWith('/api/categories')) return 'category_updated'
  if (path.startsWith('/api/document-types')) return 'document_type_updated'
  return 'record_changed'
}

/** Record id from the path (/api/x/:id/...) or from the created object in the response */
export function auditTargetId(path: string, body: any): string | null {
  const seg = path.split('/')[3]
  if (seg && seg !== 'bulk') return seg
  if (body && typeof body === 'object') {
    if (typeof body.id === 'string') return body.id
    for (const v of Object.values(body)) if (v && typeof v === 'object' && typeof (v as any).id === 'string') return (v as any).id
  }
  return null
}

// Reads of advising records are logged at most once per user, list and role every 10 minutes:
// logging every refresh would exhaust the database write quota (lists reload often).
const READ_LOG_INTERVAL_MS = 10 * 60_000
const lastReadLogged = new Map<string, number>()

// ---------------------------------------------------------------
// Record-level scoping (phase 2): every read returns only what the viewer may see
// ---------------------------------------------------------------

// Who-belongs-to-whom lookups are cached briefly per user, so a full page load
// (many parallel requests) costs one lookup instead of one per request.
const SCOPE_CACHE_TTL_MS = 30_000
const scopeCache = new Map<string, { expires: number; value: Promise<{ linked: Set<string>; exitStudents: Set<string> }> }>()

async function loadScopeSets(c: any, auth: AuthContext, needs: { linked: boolean; exitStudents: boolean }) {
  const linked = new Set<string>()
  const exitStudents = new Set<string>()
  const database = db(c)
  if (!database || (!needs.linked && !needs.exitStudents)) return { linked, exitStudents }

  const me = aliasSet(auth.userId, auth.code, auth.email)
  const people = await database.select({ id: schema.users.id, code: schema.users.code, email: schema.users.email }).from(schema.users)
  const expand = (refs: Set<string>, into: Set<string>) => {
    for (const r of refs) into.add(r)
    for (const p of people) {
      if ([p.id, p.code, p.email].some(a => refs.has(norm(a)))) [p.id, p.code, p.email].forEach(a => a && into.add(norm(a)))
    }
  }

  if (needs.linked) {
    const roster = await database.select().from(schema.studentAdvisorAssignments)
    const refs = new Set<string>()
    for (const r of roster) {
      if (!r.isActive) continue
      // Student -> their advisors; advisor -> their advisees
      if (auth.role === 'student' && me.has(norm(r.studentId))) refs.add(norm(r.advisorId))
      if (auth.role === 'advisor' && me.has(norm(r.advisorId))) refs.add(norm(r.studentId))
    }
    expand(refs, linked)
  }

  if (needs.exitStudents) {
    const cases = await database.select({ studentId: schema.exitCases.studentId }).from(schema.exitCases)
    expand(new Set(cases.map(e => norm(e.studentId)).filter(Boolean)), exitStudents)
  }

  return { linked, exitStudents }
}

async function viewerFor(c: any, auth: AuthContext, kind: Parameters<typeof scopeNeeds>[1]): Promise<Viewer> {
  const needs = scopeNeeds(auth.role, kind)
  const key = `${auth.userId}|${auth.role}|${needs.linked}|${needs.exitStudents}`
  const now = Date.now()
  let entry = scopeCache.get(key)
  if (!entry || entry.expires < now) {
    entry = { expires: now + SCOPE_CACHE_TTL_MS, value: loadScopeSets(c, auth, needs) }
    scopeCache.set(key, entry)
    entry.value.catch(() => scopeCache.delete(key))
  }
  const sets = await entry.value
  return {
    role: auth.role,
    aliases: aliasSet(auth.userId, auth.code, auth.email),
    linkedAliases: sets.linked,
    exitStudentAliases: sets.exitStudents,
  }
}

app.use('/api/*', async (c, next) => {
  const auth = c.get('auth')
  const route = c.req.method === 'GET' ? scopedRoute(c.req.path) : null
  await next()

  // Roster / user / exit-case changes alter who may see what: drop cached lookups
  if (c.req.method !== 'GET' && /^\/api\/(roster|users|exit-cases)/.test(c.req.path)) scopeCache.clear()

  // Every change by a signed-in user is audited with its result (audit-log appends are not re-logged)
  if (auth && c.req.method !== 'GET' && c.req.path !== '/api/audit-logs') {
    const resBody = await c.res.clone().json().catch(() => null)
    await writeAudit(c, {
      userId: auth.userId, userName: auth.name, userRole: auth.role,
      action: auditActionFor(c.req.method, c.req.path),
      description: `${c.req.method} ${c.req.path} → ${c.res.status} ${c.res.ok ? 'success' : 'failed'}`,
      targetId: auditTargetId(c.req.path, resBody),
    })
  }

  if (!auth || !route || c.res.status !== 200) return
  if (!(c.res.headers.get('content-type') || '').includes('application/json')) return

  const body = await c.res.clone().json().catch(() => null)
  if (body == null) return
  const scoped = scopeResponse(c.req.path, body, await viewerFor(c, auth, route.kind))
  c.res = scoped === null
    ? c.json({ error: 'User not found' }, 404)
    : c.json(scoped, 200)

  // Reads of advising records (throttled, see READ_LOG_INTERVAL_MS)
  if (route.kind !== 'users' && route.kind !== 'user' && route.kind !== 'roster' && auth.role !== 'qa_chair') {
    const key = `${auth.userId}|${auth.role}|${c.req.path}`
    const now = Date.now()
    if ((lastReadLogged.get(key) || 0) + READ_LOG_INTERVAL_MS < now) {
      lastReadLogged.set(key, now)
      const count = Array.isArray(scoped?.[route.key]) ? scoped[route.key].length : 0
      await writeAudit(c, {
        userId: auth.userId, userName: auth.name, userRole: auth.role, action: 'records_viewed',
        description: `Viewed ${count} ${route.key} (GET ${c.req.path})`,
      })
    }
  }

  // QA case-level access to exit cases / student voice is permitted but always logged (C8)
  if (auth.role === 'qa_chair' && (route.kind === 'exit' || route.kind === 'voice')) {
    const count = Array.isArray(scoped?.[route.key]) ? scoped[route.key].length : 0
    await writeAudit(c, {
      userId: auth.userId, userName: auth.name, userRole: auth.role, action: 'qa_viewed_case',
      description: `QA viewed ${count} ${route.kind === 'exit' ? 'exit cases' : 'student voice responses'} (case-level)`,
    })
  }
})

// ---------------------------------------------------------------
// Record ownership on writes: users may only change their own records
// (students: their own; advisors: their advisees'). Route rules decide the role,
// this decides the record.
// ---------------------------------------------------------------
const OWNED_TABLES = {
  requests: schema.advisingRequests,
  appointments: schema.appointments,
  'follow-ups': schema.followUps,
  'exit-cases': schema.exitCases,
  documents: schema.documents,
} as const

app.use('/api/*', async (c, next) => {
  const auth = c.get('auth')
  const method = c.req.method
  const database = db(c)
  if (!auth || method === 'GET' || method === 'OPTIONS' || !database) return next()
  if (auth.role === 'admin' || auth.role === 'super_admin' || auth.role === 'qa_chair') return next()

  const path = c.req.path
  const viewer = await viewerFor(c, auth, 'users') // student: own advisors; advisor: own advisees
  const is = (set: Set<string>, v: unknown) => v != null && v !== '' && set.has(norm(v))
  const owns = (rec: { studentId?: unknown; advisorId?: unknown }) => ownsRecord(viewer, rec)
  const forbid = async (detail: string) => {
    await writeAudit(c, { userId: auth.userId, userName: auth.name, userRole: auth.role, action: 'unauthorized_access', description: `NOT_YOUR_RECORD: ${method} ${path} (${detail})`, targetId: path })
    return c.json({ success: false, error: 'NOT_YOUR_RECORD' }, 403)
  }

  // 1. Changing or deleting an existing record
  const existing = path.match(/^\/api\/(requests|appointments|follow-ups|exit-cases|documents)\/([^/]+)(?:\/status)?$/)
  if (existing) {
    const table = OWNED_TABLES[existing[1] as keyof typeof OWNED_TABLES]
    const rec = await database.select().from(table).where(eq(table.id, decodeURIComponent(existing[2]))).get() as any
    if (rec && !owns(rec)) return forbid('record belongs to someone else')
    return next()
  }

  // 2. Creating a record for a student
  const created = method === 'POST' && path.match(/^\/api\/(requests|appointments|sessions|follow-ups|follow-up-progress|exit-cases|student-voice|early-warnings|documents|roster)$/)
  if (created) {
    const resource = created[1]
    const body = await c.req.json().catch(() => null) as Record<string, any> | null
    if (!body) return next()
    const studentRefs = [body.studentId, body.studentCode, body.studentEmail].filter(v => v != null && v !== '')
    const error = createOwnershipError(viewer, resource, body)
    if (error) return forbid(error)

    // Upserts by id: the existing record must be the user's own too
    const upsertTable = resource === 'early-warnings' ? schema.earlyWarnings : OWNED_TABLES[resource as keyof typeof OWNED_TABLES]
    if (body.id && upsertTable) {
      const current = await database.select().from(upsertTable).where(eq(upsertTable.id, String(body.id))).get() as any
      if (current && !owns(current)) return forbid('record belongs to someone else')
    }

    // Progress must be on a follow-up the user owns
    if (resource === 'follow-up-progress' && body.followUpId) {
      const followUp = await database.select().from(schema.followUps).where(eq(schema.followUps.id, String(body.followUpId))).get()
      if (followUp && !owns(followUp)) return forbid('follow-up belongs to someone else')
    }

    // Advisors may assign students to themselves only, and not take another advisor's active advisee
    if (resource === 'roster' && auth.role === 'advisor') {
      // The student may be referenced by id, code or email: match all of them
      const studentAliases = new Set(studentRefs.map(norm))
      const people = await database.select({ id: schema.users.id, code: schema.users.code, email: schema.users.email }).from(schema.users)
      for (const p of people) {
        if ([p.id, p.code, p.email].some(a => is(studentAliases, a))) [p.id, p.code, p.email].forEach(a => a && studentAliases.add(norm(a)))
      }
      const assignments = await database.select().from(schema.studentAdvisorAssignments)
      const takenByOther = assignments.some(a =>
        a.isActive && is(studentAliases, a.studentId) && !is(viewer.aliases, a.advisorId))
      if (takenByOther) return forbid('student is assigned to another advisor')
    }
  }

  return next()
})

/** Advisors may only create or edit student accounts (e.g. roster CSV import). */
function canWriteUser(auth: AuthContext | undefined, newRole: string | undefined, existingRole?: string): boolean {
  if (!auth) return false
  if (auth.role === 'admin' || auth.role === 'super_admin') return true
  return newRole === 'student' && (!existingRole || existingRole === 'student')
}

// --- Health & Info Endpoints ---
app.get('/', (c) => {
  return c.json({
    service: 'AdvisingLog API',
    status: 'online',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    environment: 'Cloudflare Workers',
    database: c.env?.DB ? 'D1 Bound' : 'D1 Pending Binding',
    hasGeminiKey: Boolean(c.env?.GEMINI_API_KEY),
  })
})

app.get('/api/info', (c) => {
  return c.json({
    app: 'AdvisingLog',
    roles: ['student', 'advisor', 'qa_chair', 'admin'],
    techStack: {
      framework: 'Hono',
      platform: 'Cloudflare Workers',
      database: 'Cloudflare D1',
      orm: 'Drizzle ORM',
      aiProvider: 'Google Gemini',
    },
  })
})

// --- Helper to safely get Drizzle DB ---
function db(c: any) {
  if (!c.env?.DB) return null
  return getDb(c.env.DB)
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character] || character))
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function encodeMimeHeader(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return `=?UTF-8?B?${btoa(binary)}?=`
}

async function sendWorkspaceEmail(
  env: Bindings,
  recipient: string,
  subject: string,
  message: string,
): Promise<{ sent: boolean; error?: string }> {
  const { GOOGLE_WORKSPACE_CLIENT_ID, GOOGLE_WORKSPACE_CLIENT_SECRET, GOOGLE_WORKSPACE_REFRESH_TOKEN, GOOGLE_WORKSPACE_SENDER } = env
  if (!GOOGLE_WORKSPACE_CLIENT_ID || !GOOGLE_WORKSPACE_CLIENT_SECRET || !GOOGLE_WORKSPACE_REFRESH_TOKEN || !GOOGLE_WORKSPACE_SENDER) {
    return { sent: false, error: 'EMAIL_PROVIDER_NOT_CONFIGURED' }
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_WORKSPACE_CLIENT_ID,
      client_secret: GOOGLE_WORKSPACE_CLIENT_SECRET,
      refresh_token: GOOGLE_WORKSPACE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  if (!tokenResponse.ok) return { sent: false, error: 'GOOGLE_TOKEN_REQUEST_FAILED' }
  const tokenData = await tokenResponse.json() as { access_token?: string }
  if (!tokenData.access_token) return { sent: false, error: 'GOOGLE_ACCESS_TOKEN_MISSING' }

  const rawMessage = [
    `From: ${GOOGLE_WORKSPACE_SENDER}`,
    `To: ${recipient}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    message,
  ].join('\r\n')
  const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
  })
  if (!gmailResponse.ok) return { sent: false, error: `GMAIL_SEND_FAILED_${gmailResponse.status}` }
  return { sent: true }
}

const notificationInput = z.object({
  userId: z.string().min(1),
  type: z.enum(['info', 'warning', 'success', 'action_required']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  relatedId: z.string().optional(),
  sendEmail: z.boolean().optional().default(false),
})

/**
 * Who may notify (and email, from the official sender) whom:
 * students -> only their own advisor; advisors -> their advisees and staff;
 * QA -> staff; admins -> anyone.
 */
export async function canNotify(c: any, auth: AuthContext, recipient: { id: string; code: string | null; email: string; role: string }) {
  if (auth.role === 'admin' || auth.role === 'super_admin') return true
  if (auth.role === 'qa_chair') return recipient.role !== 'student'
  const viewer = await viewerFor(c, auth, 'users')
  const isLinked = [recipient.id, recipient.code, recipient.email].some(a => a && viewer.linkedAliases.has(norm(a)))
  if (auth.role === 'advisor') return isLinked || recipient.role !== 'student'
  return isLinked // student -> own advisor only
}

app.get('/api/notifications', async (c) => {
  const database = db(c)
  if (!database) return c.json({ notifications: [], error: 'DATABASE_NOT_CONFIGURED' }, 503)
  // Always the signed-in user's own notifications; a ?userId= from the client is ignored
  const userId = c.get('auth')!.userId
  const rows = await database.select().from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(100)
  return c.json({ notifications: rows })
})

app.post('/api/notifications', async (c) => {
  const database = db(c)
  if (!database) return c.json({ success: false, error: 'DATABASE_NOT_CONFIGURED' }, 503)
  const parsed = notificationInput.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ success: false, error: 'INVALID_NOTIFICATION', details: parsed.error.flatten() }, 400)
  const input = parsed.data
  const recipient = await database.select({ id: schema.users.id, code: schema.users.code, email: schema.users.email, role: schema.users.role }).from(schema.users)
    .where(eq(schema.users.id, input.userId)).get()
  if (!recipient) return c.json({ success: false, error: 'RECIPIENT_NOT_FOUND' }, 404)
  if (!(await canNotify(c, c.get('auth')!, recipient))) {
    return c.json({ success: false, error: 'RECIPIENT_NOT_ALLOWED' }, 403)
  }

  const id = `NOT_${crypto.randomUUID()}`
  const createdAt = new Date().toISOString()
  let emailStatus: 'not_requested' | 'pending' | 'sent' | 'failed' = input.sendEmail ? 'pending' : 'not_requested'
  let emailError: string | null = null
  if (input.sendEmail) {
    const result = await sendWorkspaceEmail(c.env, recipient.email, input.title, input.message)
    emailStatus = result.sent ? 'sent' : 'failed'
    emailError = result.error || null
  }

  const notification = {
    id,
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    relatedId: input.relatedId || null,
    isRead: false,
    emailStatus,
    emailError,
    createdAt,
    readAt: null,
  }
  await database.insert(schema.notifications).values(notification)
  return c.json({ success: emailStatus !== 'failed', notification }, emailStatus === 'failed' ? 207 : 201)
})

app.patch('/api/notifications/:id/read', async (c) => {
  const database = db(c)
  if (!database) return c.json({ success: false, error: 'DATABASE_NOT_CONFIGURED' }, 503)
  // Only the recipient can mark their own notification as read
  await database.update(schema.notifications)
    .set({ isRead: true, readAt: new Date().toISOString() })
    .where(and(eq(schema.notifications.id, c.req.param('id')), eq(schema.notifications.userId, c.get('auth')!.userId)))
  return c.json({ success: true })
})

app.patch('/api/notifications/read-all', async (c) => {
  const database = db(c)
  if (!database) return c.json({ success: false, error: 'DATABASE_NOT_CONFIGURED' }, 503)
  // Always the signed-in user's own notifications; a userId in the body is ignored
  await database.update(schema.notifications)
    .set({ isRead: true, readAt: new Date().toISOString() })
    .where(eq(schema.notifications.userId, c.get('auth')!.userId))
  return c.json({ success: true })
})

// ============================================================
// 0. Google OAuth Authentication & SSO
// ============================================================
// 0. Google OAuth Authentication & SSO (MFU Domain & Advisee Guard)
// ============================================================
app.post('/api/auth/google', async (c) => {
  try {
    const clientId = c.env?.GOOGLE_CLIENT_ID
    const sessionSecret = c.env?.SESSION_SECRET
    if (!clientId || !sessionSecret) {
      return c.json({ success: false, error: 'AUTH_NOT_CONFIGURED', message: 'Server sign-in is not configured (GOOGLE_CLIENT_ID / SESSION_SECRET).' }, 500)
    }

    const { accessToken } = await c.req.json<{ accessToken?: string }>()
    if (!accessToken) {
      return c.json({ success: false, error: 'Missing Google access token' }, 400)
    }

    // Verify with Google: genuine token, issued for this app, verified email
    let identity
    try {
      identity = await verifyGoogleAccessToken(accessToken, clientId)
    } catch (err) {
      const code = err instanceof AuthError ? err.code : 'GOOGLE_AUTH_FAILED'
      await writeAudit(c, { userId: 'anonymous', userName: 'anonymous', userRole: 'none', action: 'login_failed', description: code })
      return c.json({ success: false, error: code, message: 'Google sign-in could not be verified. Please try again.' }, 401)
    }
    const { email, name, picture, sub: googleId } = identity

    const lowerEmail = email
    const codePrefix = lowerEmail.split('@')[0].toUpperCase()
    const superEmail = superAdminEmail(c)
    const isAuthorizedSuperAdmin = lowerEmail === superEmail

    const isMfuDomain =
      lowerEmail.endsWith('@mfu.ac.th') ||
      lowerEmail.endsWith('@student.mfu.ac.th') ||
      lowerEmail.endsWith('@lamduan.mfu.ac.th') ||
      lowerEmail.endsWith('@lamduan.ac.th')

    const database = db(c)
    if (!database) {
      return c.json({ success: false, error: 'Database unavailable' }, 503)
    }

    // 1. Search User in Cloudflare D1 (Check if registered by Admin)
    // Match by exact email. Matching the email prefix to a student code is only allowed for
    // university accounts, otherwise e.g. 6631503001@gmail.com could sign in as that student.
    let user = await database.select().from(schema.users).where(eq(schema.users.email, lowerEmail)).get()
    if (!user) {
      const allUsers = await database.select().from(schema.users)
      user = allUsers.find(
        (u) =>
          u.email?.toLowerCase().trim() === lowerEmail ||
          (isMfuDomain && u.code?.toUpperCase().trim() === codePrefix)
      )
    }

    // If Super Admin account, auto-provision if not exists or update code
    if (!user && isAuthorizedSuperAdmin) {
      const newAdmin = {
        id: 'ADM_SE_GOOGLE',
        code: 'ADM-SUPER',
        name: 'Super Admin',
        email: lowerEmail,
        role: 'super_admin' as const,
        department: 'Academic & System Affairs',
        phone: null,
        isActive: true,
        hasAiAccess: true,
        createdAt: new Date().toISOString().split('T')[0],
      }
      await database.insert(schema.users).values(newAdmin)
      user = newAdmin
    } else if (user && isAuthorizedSuperAdmin) {
      if (user.code !== 'ADM-SUPER' || user.role !== 'super_admin') {
        await database.update(schema.users).set({ code: 'ADM-SUPER', role: 'super_admin' }).where(eq(schema.users.id, user.id))
      }
      user = { ...user, code: 'ADM-SUPER', role: 'super_admin', name: user.name || 'Super Admin' }
    }

    // If not found in database (not registered by Admin)
    if (!user) {
      if (!isMfuDomain) {
        return c.json({
          success: false,
          error: 'DOMAIN_RESTRICTED',
          message: 'ไม่อนุญาตให้เข้าใช้งาน: กรุณาใช้อีเมลมหาวิทยาลัยแม่ฟ้าหลวง (@mfu.ac.th หรือ @lamduan.mfu.ac.th) หรือให้อาจารย์/ผู้ดูแลระบบลงทะเบียนอีเมลภายนอกของคุณเข้าสู่ระบบก่อน',
        }, 403)
      }

      return c.json({
        success: false,
        error: 'USER_NOT_REGISTERED',
        message: `ไม่สามารถเข้าสู่ระบบได้: บัญชีของคุณ (${lowerEmail}) ยังไม่ได้รับการเพิ่มหรือลงทะเบียนโดยผู้ดูแลระบบ (Admin) กรุณาติดต่อสำนักวิชาหรือผู้ดูแลระบบเพื่อลงทะเบียนเข้าสู่ระบบก่อน`,
        email: lowerEmail,
      }, 403)
    }

    const authenticatedUser = user

    // Check if account is active
    if (!authenticatedUser.isActive) {
      return c.json({
        success: false,
        error: 'ACCOUNT_DEACTIVATED',
        message: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ',
      }, 403)
    }

    // 4. Student Advisee Check: Student MUST be assigned to an advisor by Admin or Advisor
    let assignedAdvisor = null
    if (authenticatedUser.role === 'student') {
      const allAssignments = await database.select().from(schema.studentAdvisorAssignments).where(eq(schema.studentAdvisorAssignments.isActive, true))
      const assignment = allAssignments.find(
        (a) =>
          a.studentId === authenticatedUser.id ||
          a.studentId?.toUpperCase() === authenticatedUser.code?.toUpperCase() ||
          a.studentId?.toLowerCase() === authenticatedUser.email?.toLowerCase() ||
          a.studentId?.toLowerCase() === lowerEmail ||
          a.studentId?.toUpperCase() === codePrefix
      )

      if (!assignment) {
        return c.json({
          success: false,
          error: 'STUDENT_NOT_ASSIGNED',
          message: 'ไม่สามารถเข้าสู่ระบบได้: บัญชีนักศึกษาของคุณยังไม่ได้รับการจัดสรรอาจารย์ที่ปรึกษา กรุณาติดต่ออาจารย์ที่ปรึกษาหรือสำนักวิชาเพื่อดำเนินการเพิ่มรายชื่อ',
          studentInfo: {
            name: authenticatedUser.name,
            code: authenticatedUser.code,
            email: authenticatedUser.email,
          },
        }, 403)
      }

      // Fetch advisor details
      const activeAdvisorId = assignment.advisorId
      if (activeAdvisorId) {
        const allUsers = await database.select().from(schema.users)
        assignedAdvisor = allUsers.find(
          (u) =>
            u.id === activeAdvisorId ||
            u.code?.toUpperCase() === String(activeAdvisorId).toUpperCase() ||
            u.email?.toLowerCase() === String(activeAdvisorId).toLowerCase()
        ) || null
      }
    }

    // Update real profile name and picture from Google OAuth
    if (name && (user.name.startsWith('Student ') || user.name.includes('@') || user.name === codePrefix)) {
      try {
        await database.update(schema.users).set({ name }).where(eq(schema.users.id, user.id))
        user = { ...user, name }
      } catch (_e) {}
    }

    const sessionToken = await signSession(
      { sub: user.id, email: lowerEmail, name: name || user.name, role: user.role as Role },
      sessionSecret
    )
    await writeAudit(c, { userId: user.id, userName: name || user.name, userRole: user.role, action: 'user_login', description: `Signed in with Google (${googleId ? 'verified' : 'no sub'})` })

    return c.json({
      success: true,
      user: {
        ...user,
        name: name || user.name,
        avatar: picture || null,
        advisor: assignedAdvisor,
      },
      token: sessionToken,
    })
  } catch (err: any) {
    return c.json({ success: false, error: err.message || 'Failed to authenticate with Google' }, 500)
  }
})

// ============================================================
// 1. Users & Roster Management
// ============================================================
app.get('/api/users', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)
  
  const superEmail = superAdminEmail(c)
  const role = c.req.query('role')
  const list = role
    ? await database.select().from(schema.users).where(eq(schema.users.role, role as any))
    : await database.select().from(schema.users)

  const normalized = list.map((u) => {
    if (u.email?.toLowerCase().trim() === superEmail || u.code === 'ADM-SUPER') {
      const isOldName = !u.name || u.name.includes('System Admin') || u.name.includes('SE AdvisingLog') || u.name.includes('System Super Admin')
      return {
        ...u,
        name: isOldName ? 'Super Admin' : u.name,
        role: 'super_admin' as const,
      }
    }
    return u
  })

  return c.json({ users: normalized })
})

app.get('/api/users/:id', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)
  
  const id = c.req.param('id')
  const user = await database.select().from(schema.users).where(eq(schema.users.id, id)).get()
  if (!user) return c.json({ error: 'User not found' }, 404)
  return c.json({ user })
})

function deriveNameFromEmail(email: string): string {
  const prefix = (email || '').trim().split('@')[0] || ''
  if (!prefix) return 'User'
  if (/^\d/.test(prefix)) {
    const digitMatch = prefix.match(/^\d+/)
    return digitMatch ? `Student ${digitMatch[0]}` : `Student ${prefix}`
  }
  const words = prefix
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  return words.length > 0 ? words.join(' ') : prefix
}

app.post('/api/users', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()
  const cleanEmail = (body.email || '').trim().toLowerCase()
  if (!cleanEmail) {
    return c.json({ error: 'Email is required' }, 400)
  }

  const superEmail = superAdminEmail(c)
  const emailPrefix = cleanEmail.split('@')[0]
  const isStudent = /^\d/.test(emailPrefix) || cleanEmail.includes('@student.') || cleanEmail.includes('@lamduan.')
  const assignedRole = isStudent
    ? 'student'
    : (cleanEmail === superEmail ? 'super_admin' : (body.role === 'super_admin' ? 'admin' : (body.role || 'advisor')))
  const autoCode = body.code ? String(body.code).trim() : (isStudent ? emailPrefix : `STAFF_${Date.now().toString().slice(-4)}`)
  const derivedName = body.name?.trim() || deriveNameFromEmail(body.email)

  // Look up existing user by id, email, or code to avoid SQLite unique constraint errors
  const allUsers = await database.select().from(schema.users)
  const existingUser = allUsers.find(
    (u) =>
      u.email.toLowerCase() === cleanEmail ||
      u.code.toUpperCase() === autoCode.toUpperCase() ||
      (body.id && u.id === body.id)
  )
  if (!canWriteUser(c.get('auth'), assignedRole, existingUser?.role)) {
    return c.json({ success: false, error: 'Advisors can only add or edit student accounts' }, 403)
  }

  const userObj = {
    id: existingUser ? existingUser.id : (body.id || `USER_${Date.now()}`),
    code: existingUser ? (body.code ? String(body.code).trim() : existingUser.code) : autoCode,
    name: derivedName,
    email: cleanEmail,
    role: assignedRole,
    department: body.department || existingUser?.department || 'School of Applied Digital Technology (ADT)',
    phone: body.phone !== undefined ? body.phone : (existingUser?.phone || null),
    isActive: body.isActive !== undefined ? body.isActive : (existingUser ? existingUser.isActive : true),
    hasAiAccess: body.hasAiAccess !== undefined ? body.hasAiAccess : (existingUser ? existingUser.hasAiAccess : false),
    createdAt: existingUser ? existingUser.createdAt : (body.createdAt || new Date().toISOString().split('T')[0]),
  }

  if (existingUser) {
    await database.update(schema.users).set(userObj).where(eq(schema.users.id, existingUser.id))
  } else {
    await database.insert(schema.users).values(userObj)
  }
  return c.json({ success: true, user: userObj })
})

app.post('/api/users/bulk', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json<{ users: any[] }>()
  const userList = Array.isArray(body?.users) ? body.users : []
  const superEmail = superAdminEmail(c)

  const allUsers = await database.select().from(schema.users)
  const insertedUsers = []

  for (const item of userList) {
    const cleanEmail = (item.email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) continue

    const emailPrefix = cleanEmail.split('@')[0]
    const isStudent = /^\d/.test(emailPrefix) || cleanEmail.includes('@student.') || cleanEmail.includes('@lamduan.')
    const assignedRole = isStudent
      ? 'student'
      : (cleanEmail === superEmail ? 'super_admin' : (item.role === 'super_admin' ? 'admin' : (item.role || 'advisor')))

    const autoCode = item.code ? String(item.code).trim() : (isStudent ? emailPrefix : `STAFF_${Date.now().toString().slice(-4)}`)
    const derivedName = item.name?.trim() || deriveNameFromEmail(item.email)

    const existingUser = allUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.code.toUpperCase() === autoCode.toUpperCase() ||
        (item.id && u.id === item.id)
    )
    if (!canWriteUser(c.get('auth'), assignedRole, existingUser?.role)) continue

    const userObj = {
      id: existingUser ? existingUser.id : (item.id || `USER_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`),
      code: existingUser ? (item.code ? String(item.code).trim() : existingUser.code) : autoCode,
      name: derivedName,
      email: cleanEmail,
      role: assignedRole,
      department: item.department || existingUser?.department || 'School of Applied Digital Technology (ADT)',
      phone: item.phone !== undefined ? item.phone : (existingUser?.phone || null),
      isActive: item.isActive !== undefined ? item.isActive : (existingUser ? existingUser.isActive : true),
      hasAiAccess: item.hasAiAccess !== undefined ? item.hasAiAccess : (existingUser ? existingUser.hasAiAccess : false),
      createdAt: existingUser ? existingUser.createdAt : (item.createdAt || new Date().toISOString().split('T')[0]),
    }

    if (existingUser) {
      await database.update(schema.users).set(userObj).where(eq(schema.users.id, existingUser.id))
    } else {
      await database.insert(schema.users).values(userObj)
      allUsers.push(userObj as any)
    }
    insertedUsers.push(userObj)
  }

  return c.json({ success: true, count: insertedUsers.length, users: insertedUsers })
})

app.patch('/api/users/:id', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  const body = await c.req.json()

  // Protect Super Admin from being deactivated
  const targetUser = await database.select().from(schema.users).where(eq(schema.users.id, id)).get()
  const superEmail = superAdminEmail(c)
  if (
    targetUser &&
    body.isActive === false &&
    (targetUser.id === 'ADM_SE_GOOGLE' || targetUser.code === 'ADM-SUPER' || targetUser.email?.toLowerCase().trim() === superEmail)
  ) {
    return c.json({ success: false, error: 'Cannot deactivate Master Super Admin account' }, 400)
  }

  const auth = c.get('auth')
  if (!targetUser) return c.json({ success: false, error: 'User not found' }, 404)
  if (!canWriteUser(auth, body.role ?? targetUser.role, targetUser.role)) {
    return c.json({ success: false, error: 'Advisors can only edit student accounts' }, 403)
  }
  // Only the configured super admin email holds super_admin; nobody can grant it here
  if (body.role === 'super_admin') {
    return c.json({ success: false, error: 'The super_admin role cannot be assigned' }, 403)
  }
  const { id: _ignoredId, ...updates } = body
  await database.update(schema.users).set(updates).where(eq(schema.users.id, id))
  return c.json({ success: true })
})

app.delete('/api/users/:id', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  const targetUser = await database.select().from(schema.users).where(eq(schema.users.id, id)).get()
  if (!targetUser) {
    return c.json({ error: 'User not found' }, 404)
  }

  // Protect Super Admin from deletion
  const superEmail = superAdminEmail(c)
  if (
    targetUser.id === 'ADM_SE_GOOGLE' ||
    targetUser.code === 'ADM-SUPER' ||
    targetUser.email?.toLowerCase().trim() === superEmail
  ) {
    return c.json({ success: false, error: 'Cannot delete Master Super Admin account' }, 400)
  }

  // Clean up any student-advisor assignments involving this user
  await database.delete(schema.studentAdvisorAssignments).where(
    or(
      eq(schema.studentAdvisorAssignments.studentId, id),
      eq(schema.studentAdvisorAssignments.advisorId, id)
    )
  )

  // Delete the user record
  await database.delete(schema.users).where(eq(schema.users.id, id))
  return c.json({ success: true, deletedId: id })
})

app.get('/api/roster', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)
  const list = await database.select().from(schema.studentAdvisorAssignments).orderBy(desc(schema.studentAdvisorAssignments.assignedAt))
  
  // Deduplicate by studentId so each student only has their latest assignment
  const seenStudents = new Set<string>()
  const deduplicated = []
  for (const r of list) {
    const key = (r.studentId || '').toLowerCase()
    if (r.isActive && key) {
      if (!seenStudents.has(key)) {
        seenStudents.add(key)
        deduplicated.push(r)
      }
    } else {
      deduplicated.push(r)
    }
  }
  return c.json({ roster: deduplicated })
})

app.post('/api/roster', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()
  const allUsers = await database.select().from(schema.users)

  // Resolve student and advisor IDs if codes or emails were provided
  const student = allUsers.find(
    (u) =>
      u.id === body.studentId ||
      u.code.toUpperCase() === String(body.studentId).toUpperCase() ||
      u.email.toLowerCase() === String(body.studentId).toLowerCase()
  )
  const advisor = allUsers.find(
    (u) =>
      u.id === body.advisorId ||
      u.code.toUpperCase() === String(body.advisorId).toUpperCase() ||
      u.email.toLowerCase() === String(body.advisorId).toLowerCase()
  )

  const targetStudentId = student ? student.id : body.studentId
  const targetAdvisorId = advisor ? advisor.id : body.advisorId

  const allAssignments = await database.select().from(schema.studentAdvisorAssignments)
  const existingMatches = allAssignments.filter(
    (a) =>
      a.studentId === targetStudentId ||
      (student && (a.studentId === student.code || a.studentId === student.email)) ||
      (body.id && a.id === body.id)
  )
  const existing = existingMatches[0]

  const assignment = {
    id: existing ? existing.id : (body.id || `R_${Date.now()}`),
    studentId: targetStudentId,
    advisorId: targetAdvisorId,
    assignedAt: body.assignedAt || (existing ? existing.assignedAt : new Date().toISOString().split('T')[0]),
    isActive: body.isActive !== undefined ? body.isActive : true,
  }

  if (existing) {
    await database.update(schema.studentAdvisorAssignments).set(assignment).where(eq(schema.studentAdvisorAssignments.id, existing.id))
    // Clean up any other duplicate stale rows for this student
    for (let i = 1; i < existingMatches.length; i++) {
      await database.delete(schema.studentAdvisorAssignments).where(eq(schema.studentAdvisorAssignments.id, existingMatches[i].id))
    }
  } else {
    await database.insert(schema.studentAdvisorAssignments).values(assignment)
  }
  return c.json({ success: true, assignment })
})

// ============================================================
// 2. Advising Requests
// ============================================================
app.get('/api/requests', async (c) => {
  const database = db(c)
  if (!database) return c.json({ requests: [] })

  let studentId = c.req.query('studentId')
  let advisorId = c.req.query('advisorId')

  if (studentId) {
    const matchedStudent = await database.select().from(schema.users).where(
      or(
        eq(schema.users.id, studentId),
        eq(schema.users.code, studentId),
        eq(schema.users.email, studentId),
      )
    ).get()
    if (matchedStudent) {
      studentId = matchedStudent.id
    }
  }

  if (advisorId) {
    const matchedAdvisor = await database.select().from(schema.users).where(
      or(
        eq(schema.users.id, advisorId),
        eq(schema.users.code, advisorId),
        eq(schema.users.email, advisorId),
      )
    ).get()
    if (matchedAdvisor) {
      advisorId = matchedAdvisor.id
    }
  }

  function normalizeReq(r: any) {
    let att = []
    if (Array.isArray(r.attachments)) {
      att = r.attachments
    } else if (typeof r.attachments === 'string') {
      try { att = JSON.parse(r.attachments) } catch { att = [] }
    }
    return { ...r, attachments: Array.isArray(att) ? att : [] }
  }

  let query = database.select().from(schema.advisingRequests)
  if (studentId) {
    const list = await query.where(eq(schema.advisingRequests.studentId, studentId))
    return c.json({ requests: list.map(normalizeReq) })
  } else if (advisorId) {
    const list = await query.where(eq(schema.advisingRequests.advisorId, advisorId))
    return c.json({ requests: list.map(normalizeReq) })
  }

  const allRequests = await query.orderBy(desc(schema.advisingRequests.createdAt))
  return c.json({ requests: allRequests.map(normalizeReq) })
})

app.post('/api/requests', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()

  let studentId = body.studentId
  let advisorId = body.advisorId

  const candidateStudentCodes = [studentId, body.studentCode, body.studentEmail].filter(Boolean) as string[]

  // Resilient student resolution (by id, code, or email)
  const studentUser = studentId ? await database.select().from(schema.users).where(
    or(
      eq(schema.users.id, studentId),
      eq(schema.users.code, studentId),
      eq(schema.users.email, studentId),
      ...(body.studentCode ? [eq(schema.users.code, body.studentCode)] : []),
      ...(body.studentEmail ? [eq(schema.users.email, body.studentEmail)] : [])
    )
  ).get() : undefined
  let resolvedStudent = studentUser
  if (studentUser) {
    studentId = studentUser.id
  } else {
    const allUsers = await database.select().from(schema.users)
    const matchedStudent = allUsers.find(
      u => candidateStudentCodes.some(c =>
        u.id === c ||
        (u.code && (u.code.toUpperCase() === c.toUpperCase() || c.includes(u.code))) ||
        (u.email && (u.email.toLowerCase() === c.toLowerCase() || c.toLowerCase().includes(u.email.toLowerCase())))
      )
    )
    if (matchedStudent) {
      resolvedStudent = matchedStudent
      studentId = matchedStudent.id
    }
  }

  // Resilient advisor resolution (by id, code, or email)
  const advisorUser = advisorId ? await database.select().from(schema.users).where(
    or(
      eq(schema.users.id, advisorId),
      eq(schema.users.code, advisorId),
      eq(schema.users.email, advisorId),
    )
  ).get() : undefined
  let resolvedAdvisor = advisorUser
  if (advisorUser) {
    advisorId = advisorUser.id
  } else {
    const allUsers = await database.select().from(schema.users)
    const matchedAdvisor = allUsers.find(
      u => u.id === advisorId ||
           (u.code && advisorId && (u.code.toUpperCase() === advisorId.toUpperCase() || advisorId.includes(u.code))) ||
           (u.email && advisorId && (u.email.toLowerCase() === advisorId.toLowerCase() || advisorId.toLowerCase().includes(u.email.toLowerCase())))
    )
    if (matchedAdvisor) {
      resolvedAdvisor = matchedAdvisor
      advisorId = matchedAdvisor.id
    }
  }

  if (!studentId || !resolvedStudent) {
    return c.json({ error: 'The selected student account was not found.' }, 400)
  }
  if (!advisorId || !resolvedAdvisor) {
    return c.json({ error: 'The selected advisor account was not found.' }, 400)
  }

  let reqId = body.id || `REQ_${Date.now()}`
  const existingReq = await database.select({ id: schema.advisingRequests.id })
    .from(schema.advisingRequests)
    .where(eq(schema.advisingRequests.id, reqId))
    .get()
  if (existingReq) {
    reqId = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
  }

  const newReq = {
    id: reqId,
    studentId,
    advisorId,
    category: body.category,
    subCategory: body.subCategory || null,
    details: body.details,
    preferredDate: body.preferredDate,
    preferredTime: body.preferredTime,
    attachments: typeof body.attachments === 'string' ? body.attachments : JSON.stringify(body.attachments || []),
    pdpaConsent: body.pdpaConsent !== undefined ? body.pdpaConsent : true,
    status: body.status || 'requested',
    createdAt: body.createdAt || new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  }

  try {
    await database.insert(schema.advisingRequests).values(newReq)
    return c.json({ success: true, request: newReq }, 201)
  } catch (error) {
    console.error('Failed to create advising request:', error)
    return c.json({ error: 'The advising request could not be saved.' }, 500)
  }
})

app.patch('/api/requests/:id/status', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  const body = await c.req.json()
  if (body.status === 'cancelled') {
    if (typeof body.cancellationReason !== 'string' || !body.cancellationReason.trim()) {
      return c.json({ error: 'A cancellation reason is required.' }, 400)
    }
  }
  const updates: Record<string, any> = {
    status: body.status,
    updatedAt: new Date().toISOString().split('T')[0],
  }
  if (body.cancellationReason !== undefined) {
    updates.cancellationReason = body.cancellationReason
  }
  if (body.cancelledBy !== undefined) {
    updates.cancelledBy = body.cancelledBy
    updates.cancelledAt = new Date().toISOString().split('T')[0]
  }
  await database.update(schema.advisingRequests)
    .set(updates)
    .where(eq(schema.advisingRequests.id, id))
  return c.json({ success: true })
})

app.delete('/api/requests/:id', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  await database.delete(schema.advisingRequests).where(eq(schema.advisingRequests.id, id))
  return c.json({ success: true })
})

// ============================================================
// 3. Appointments & Advising Sessions
// ============================================================
app.get('/api/appointments', async (c) => {
  const database = db(c)
  if (!database) return c.json({ appointments: [] })
  const list = await database.select().from(schema.appointments).orderBy(desc(schema.appointments.scheduledDate))
  return c.json({ appointments: list })
})

app.post('/api/appointments', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()

  // Time Slot Collision Check: prevent scheduling duplicate appointments for the same advisor at the same date and time
  if (body.advisorId && body.scheduledDate && body.scheduledTime) {
    const existing = await database.select().from(schema.appointments).where(
      and(
        eq(schema.appointments.advisorId, body.advisorId),
        eq(schema.appointments.scheduledDate, body.scheduledDate),
        eq(schema.appointments.scheduledTime, body.scheduledTime),
        eq(schema.appointments.status, 'scheduled'),
      )
    ).get()

    if (existing && (!body.id || existing.id !== body.id)) {
      return c.json({ error: 'Time slot collision: The advisor already has an appointment scheduled at this time.', collision: true }, 409)
    }
  }

  const newApt = {
    id: body.id || `APT${Date.now()}`,
    requestId: body.requestId,
    studentId: body.studentId,
    advisorId: body.advisorId,
    scheduledDate: body.scheduledDate,
    scheduledTime: body.scheduledTime,
    location: body.location,
    status: body.status || 'scheduled',
    studentConfirmed: body.studentConfirmed || false,
    studentDeclined: body.studentDeclined || false,
    studentDeclineReason: body.studentDeclineReason || null,
    createdAt: body.createdAt || new Date().toISOString().split('T')[0],
  }

  await database.insert(schema.appointments).values(newApt)
  return c.json({ success: true, appointment: newApt }, 201)
})

app.patch('/api/appointments/:id/status', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  const body = await c.req.json()
  const allowedStatuses = ['scheduled', 'completed', 'cancelled']
  if (!allowedStatuses.includes(body.status)) {
    return c.json({ error: 'Invalid appointment status.' }, 400)
  }

  await database.update(schema.appointments)
    .set({ status: body.status })
    .where(eq(schema.appointments.id, id))
  return c.json({ success: true })
})

app.get('/api/sessions', async (c) => {
  const database = db(c)
  if (!database) return c.json({ sessions: [] })
  const list = await database.select().from(schema.advisingSessions).orderBy(desc(schema.advisingSessions.sessionDate))
  return c.json({ sessions: list })
})

app.post('/api/sessions', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()

  let studentId = body.studentId
  let advisorId = body.advisorId

  const studentUser = await database.select().from(schema.users).where(
    or(
      eq(schema.users.id, studentId),
      eq(schema.users.code, studentId),
      eq(schema.users.email, studentId),
    )
  ).get()
  if (studentUser) studentId = studentUser.id

  const advisorUser = await database.select().from(schema.users).where(
    or(
      eq(schema.users.id, advisorId),
      eq(schema.users.code, advisorId),
      eq(schema.users.email, advisorId),
    )
  ).get()
  if (advisorUser) advisorId = advisorUser.id

  let appointmentId = body.appointmentId && typeof body.appointmentId === 'string' && body.appointmentId.trim() !== '' ? body.appointmentId.trim() : null
  if (appointmentId) {
    const aptExists = await database.select({ id: schema.appointments.id }).from(schema.appointments).where(eq(schema.appointments.id, appointmentId)).get()
    if (!aptExists) appointmentId = null
  }

  const newSession = {
    id: body.id || `SES${Date.now()}`,
    requestId: body.requestId,
    appointmentId: appointmentId,
    studentId: studentId,
    advisorId: advisorId,
    sessionDate: body.sessionDate || new Date().toISOString().split('T')[0],
    summary: body.summary || '',
    problem: body.problem || body.summary || '',
    advice: body.advice || body.summary || '',
    actionsTaken: body.actionsTaken || '',
    outcome: body.outcome || '',
    createdAt: body.createdAt || new Date().toISOString().split('T')[0],
  }

  await database.insert(schema.advisingSessions).values(newSession)
  return c.json({ success: true, session: newSession }, 201)
})

app.patch('/api/sessions/:id', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  const body = await c.req.json()
  const updates = Object.fromEntries(
    ['sessionDate', 'summary', 'problem', 'advice', 'actionsTaken', 'outcome']
      .filter(field => body[field] !== undefined)
      .map(field => [field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), body[field]])
  )

  if (Object.keys(updates).length === 0) return c.json({ error: 'No session fields to update.' }, 400)
  await database.update(schema.advisingSessions).set(updates).where(eq(schema.advisingSessions.id, id))
  const session = await database.select().from(schema.advisingSessions).where(eq(schema.advisingSessions.id, id)).get()
  return session ? c.json({ success: true, session }) : c.json({ error: 'Session not found.' }, 404)
})

// ============================================================
// 4. Follow-ups & Student Progress Tracking
// ============================================================
app.get('/api/follow-ups', async (c) => {
  const database = db(c)
  if (!database) return c.json({ followUps: [] })

  let studentId = c.req.query('studentId')
  if (studentId) {
    const studentUser = await database.select().from(schema.users).where(
      or(
        eq(schema.users.id, studentId),
        eq(schema.users.code, studentId),
        eq(schema.users.email, studentId),
      )
    ).get()
    if (studentUser) studentId = studentUser.id

    const list = await database.select().from(schema.followUps).where(eq(schema.followUps.studentId, studentId))
    return c.json({ followUps: list })
  }
  const allFollowUps = await database.select().from(schema.followUps).orderBy(desc(schema.followUps.createdAt))
  return c.json({ followUps: allFollowUps })
})

app.post('/api/follow-ups', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()

  let studentId = body.studentId
  let advisorId = body.advisorId

  const studentUser = await database.select().from(schema.users).where(
    or(
      eq(schema.users.id, studentId),
      eq(schema.users.code, studentId),
      eq(schema.users.email, studentId),
    )
  ).get()
  if (studentUser) studentId = studentUser.id

  const advisorUser = await database.select().from(schema.users).where(
    or(
      eq(schema.users.id, advisorId),
      eq(schema.users.code, advisorId),
      eq(schema.users.email, advisorId),
    )
  ).get()
  if (advisorUser) advisorId = advisorUser.id

  let sessionId = body.sessionId && typeof body.sessionId === 'string' && body.sessionId.trim() !== '' ? body.sessionId.trim() : null
  if (sessionId) {
    const sesExists = await database.select({ id: schema.advisingSessions.id }).from(schema.advisingSessions).where(eq(schema.advisingSessions.id, sessionId)).get()
    if (!sesExists) sessionId = null
  }

  let requestId = body.requestId && typeof body.requestId === 'string' && body.requestId.trim() !== '' ? body.requestId.trim() : null
  if (requestId) {
    const reqExists = await database.select({ id: schema.advisingRequests.id }).from(schema.advisingRequests).where(eq(schema.advisingRequests.id, requestId)).get()
    if (!reqExists) requestId = null
  }

  const newFollowUp = {
    id: body.id || `FOL${Date.now()}`,
    sessionId: sessionId,
    requestId: requestId,
    studentId: studentId,
    advisorId: advisorId,
    task: body.task,
    dueDate: body.dueDate,
    status: body.status || 'pending',
    completedAt: body.completedAt || null,
    createdAt: body.createdAt || new Date().toISOString().split('T')[0],
  }

  await database.insert(schema.followUps).values(newFollowUp)
  return c.json({ success: true, followUp: newFollowUp }, 201)
})

app.patch('/api/follow-ups/:id/status', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  const body = await c.req.json()
  await database.update(schema.followUps)
    .set({
      status: body.status,
      ...(body.dueDate !== undefined ? { dueDate: body.dueDate } : {}),
      completedAt: body.status === 'completed' ? new Date().toISOString().split('T')[0] : null,
    })
    .where(eq(schema.followUps.id, id))
  return c.json({ success: true })
})

app.get('/api/follow-up-progress', async (c) => {
  const database = db(c)
  if (!database) return c.json({ progress: [] })
  const list = await database.select().from(schema.followUpProgress)
  return c.json({ progress: list })
})

app.post('/api/follow-up-progress', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()
  let studentId = body.studentId
  if (studentId) {
    const studentUser = await database.select().from(schema.users).where(
      or(
        eq(schema.users.id, studentId),
        eq(schema.users.code, studentId),
        eq(schema.users.email, studentId),
      )
    ).get()
    if (studentUser) studentId = studentUser.id
  }

  const progressRecord = {
    id: body.id || `FUP${Date.now()}`,
    followUpId: body.followUpId,
    studentId: studentId,
    progress: body.progress || 0,
    notes: body.notes || '',
    status: body.status || 'in_progress',
    createdAt: body.createdAt || new Date().toISOString().split('T')[0],
  }

  await database.insert(schema.followUpProgress).values(progressRecord).onConflictDoUpdate({
    target: schema.followUpProgress.id,
    set: progressRecord,
  })
  return c.json({ success: true, progress: progressRecord })
})

// ============================================================
// 5. Exit Cases & Student Voice Survey (AUN-QA Criteria 6 & 8)
// ============================================================
app.get('/api/exit-cases', async (c) => {
  const database = db(c)
  if (!database) return c.json({ exitCases: [] })
  const list = await database.select().from(schema.exitCases).orderBy(desc(schema.exitCases.createdAt))
  const normalized = list.map(e => {
    let docs = []
    if (Array.isArray(e.documents)) {
      docs = e.documents
    } else if (typeof e.documents === 'string') {
      try { docs = JSON.parse(e.documents) } catch { docs = [] }
    }
    return { ...e, documents: Array.isArray(docs) ? docs : [] }
  })
  return c.json({ exitCases: normalized })
})

app.post('/api/exit-cases', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  try {
    const body = await c.req.json()

    let studentId = body.studentId
    if (studentId) {
      const studentUser = await database.select().from(schema.users).where(
        or(
          eq(schema.users.id, studentId),
          eq(schema.users.code, studentId),
          eq(schema.users.email, studentId),
        )
      ).get()
      if (studentUser) studentId = studentUser.id
    }

    let advisorId = body.advisorId
    if (advisorId) {
      const advUser = await database.select().from(schema.users).where(
        or(
          eq(schema.users.id, advisorId),
          eq(schema.users.code, advisorId),
          eq(schema.users.email, advisorId),
        )
      ).get()
      if (advUser) advisorId = advUser.id
    }

    // Map frontend statuses to schema enum if needed
    let status = body.status || 'submitted'
    if (status === 'open') status = 'submitted'
    else if (status === 'under_review') status = 'advisor_reviewed'
    else if (status === 'resolved' || status === 'closed') status = 'completed'

    const newExitCase = {
      id: body.id || `EXT${Date.now()}`,
      studentId: studentId || body.studentId,
      advisorId: advisorId || body.advisorId,
      exitType: body.exitType,
      reasonCode: body.reasonCode,
      reasonCategory: body.reasonCategory || body.reasonCode || 'general',
      details: body.details || '',
      documents: typeof body.documents === 'string' ? body.documents : JSON.stringify(body.documents || []),
      advisorAssessment: body.advisorAssessment || null,
      status,
      pdpaConsent: body.pdpaConsent !== undefined ? body.pdpaConsent : true,
      voiceSurveyCompleted: body.voiceSurveyCompleted || false,
      createdAt: body.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    }

    await database.insert(schema.exitCases).values(newExitCase).onConflictDoUpdate({
      target: schema.exitCases.id,
      set: newExitCase,
    })
    return c.json({ success: true, exitCase: newExitCase }, 201)
  } catch (err: any) {
    console.error('Failed to create exit case:', err)
    return c.json({ error: err?.message || 'Failed to create exit case', details: String(err) }, 500)
  }
})

app.patch('/api/exit-cases/:id', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const updates: Record<string, any> = { ...body, updatedAt: new Date().toISOString().split('T')[0] }
    if (updates.status === 'open') updates.status = 'submitted'
    else if (updates.status === 'under_review') updates.status = 'advisor_reviewed'
    else if (updates.status === 'resolved' || updates.status === 'closed') updates.status = 'completed'

    await database.update(schema.exitCases)
      .set(updates)
      .where(eq(schema.exitCases.id, id))
    return c.json({ success: true })
  } catch (err: any) {
    console.error('Failed to update exit case:', err)
    return c.json({ error: err?.message || 'Failed to update exit case' }, 500)
  }
})

app.get('/api/student-voice', async (c) => {
  const database = db(c)
  if (!database) return c.json({ surveys: [] })
  const list = await database.select().from(schema.studentVoiceResponses).orderBy(desc(schema.studentVoiceResponses.createdAt))
  const formatted = list.map(item => {
    let factors: string[] = []
    try {
      factors = typeof item.primaryFactors === 'string' ? JSON.parse(item.primaryFactors) : (item.primaryFactors || [])
      if (!Array.isArray(factors)) factors = []
    } catch {
      factors = []
    }
    return {
      id: item.id,
      exitCaseId: item.exitCaseId || undefined,
      studentId: item.studentId || undefined,
      isAnonymous: Boolean(item.isAnonymous),
      exitType: item.exitType as any,
      academicYear: item.academicYear,
      primaryFactors: factors,
      ratings: {
        curriculumRelevance: item.curriculumRating ?? 3,
        teachingQuality: item.teachingRating ?? 3,
        advisorSupport: item.advisorRating ?? 3,
        universityServices: item.servicesRating ?? 3,
        overallExperience: item.overallRating ?? 3,
      },
      whatCouldUniversityDoBetter: item.whatCouldUniversityDoBetter || '',
      curriculumImprovementSuggestions: item.curriculumImprovementSuggestions || '',
      adviceForFutureStudents: item.adviceForFutureStudents || '',
      shareWithAdvisor: Boolean(item.shareWithAdvisor),
      createdAt: item.createdAt,
    }
  })
  return c.json({ surveys: formatted })
})

app.post('/api/student-voice', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()
  const survey = {
    id: body.id || `SVR${Date.now()}`,
    exitCaseId: body.exitCaseId || null,
    studentId: body.isAnonymous ? null : body.studentId,
    isAnonymous: body.isAnonymous !== undefined ? body.isAnonymous : false,
    exitType: body.exitType,
    academicYear: body.academicYear || '2026',
    primaryFactors: typeof body.primaryFactors === 'string' ? body.primaryFactors : JSON.stringify(body.primaryFactors || []),
    curriculumRating: body.ratings?.curriculumRelevance ?? body.curriculumRating ?? 3,
    teachingRating: body.ratings?.teachingQuality ?? body.teachingRating ?? 3,
    advisorRating: body.ratings?.advisorSupport ?? body.advisorRating ?? 3,
    servicesRating: body.ratings?.universityServices ?? body.servicesRating ?? 3,
    overallRating: body.ratings?.overallExperience ?? body.overallRating ?? 3,
    whatCouldUniversityDoBetter: body.whatCouldUniversityDoBetter || null,
    curriculumImprovementSuggestions: body.curriculumImprovementSuggestions || null,
    adviceForFutureStudents: body.adviceForFutureStudents || null,
    shareWithAdvisor: body.shareWithAdvisor !== undefined ? body.shareWithAdvisor : true,
    createdAt: body.createdAt || new Date().toISOString().split('T')[0],
  }

  await database.insert(schema.studentVoiceResponses).values(survey)
  return c.json({ success: true, survey }, 201)
})

// ============================================================
// 6. Early Warnings & Indicators
// ============================================================
app.get('/api/early-warnings', async (c) => {
  const database = db(c)
  if (!database) return c.json({ earlyWarnings: [] })
  const list = await database.select().from(schema.earlyWarnings).orderBy(desc(schema.earlyWarnings.createdAt))
  const formatted = list.map(item => {
    let extra: any = {}
    try {
      extra = JSON.parse(item.indicators || '{}')
    } catch {}
    return {
      id: item.id,
      studentId: item.studentId,
      advisorId: extra.advisorId || 'ADV001',
      warningType: extra.warningType || 'academic_risk',
      severity: item.riskLevel || extra.severity || 'medium',
      description: item.notes || extra.description || '',
      dateDetected: extra.dateDetected || item.createdAt,
      recommendedAction: extra.recommendedAction || '',
      followUpDate: extra.followUpDate || '',
      status: item.status,
      createdAt: item.createdAt,
      followUps: Array.isArray(extra.followUps) ? extra.followUps : [],
      referrals: (Array.isArray(extra.followUps) ? extra.followUps : [])
        .filter((f: any) => f.referredTo)
        .map((f: any) => ({ to: f.referredTo, status: f.status })),
    }
  })
  return c.json({ earlyWarnings: formatted })
})

/** Early-warning follow-ups are stored with the warning (no separate table). Referral = coded destination. */
function sanitizeWarningFollowUps(list: unknown) {
  if (!Array.isArray(list)) return []
  const str = (v: unknown, max: number) => (v == null ? '' : String(v).slice(0, max))
  return list.slice(0, 100).map((f: any) => ({
    id: str(f?.id, 64),
    advisorId: str(f?.advisorId, 64),
    notes: str(f?.notes, 2000),
    actionsTaken: str(f?.actionsTaken, 2000),
    outcome: str(f?.outcome, 2000),
    followUpDate: str(f?.followUpDate, 32),
    status: ['in_progress', 'completed', 'pending'].includes(f?.status) ? f.status : 'in_progress',
    referredTo: f?.referredTo ? str(f.referredTo, 64) : undefined,
    createdAt: str(f?.createdAt, 40),
  }))
}

app.post('/api/early-warnings', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()
  const record = {
    id: body.id || `EW${Date.now()}`,
    studentId: body.studentId,
    riskLevel: (body.severity === 'critical' ? 'critical' : body.severity === 'high' ? 'high' : body.severity === 'low' ? 'low' : 'medium') as any,
    indicators: JSON.stringify({
      advisorId: body.advisorId,
      warningType: body.warningType,
      severity: body.severity,
      description: body.description,
      dateDetected: body.dateDetected,
      recommendedAction: body.recommendedAction,
      followUpDate: body.followUpDate,
      followUps: sanitizeWarningFollowUps(body.followUps),
    }),
    status: body.status || 'active',
    notes: body.description || '',
    createdAt: body.createdAt || new Date().toISOString().split('T')[0],
  }

  await database.insert(schema.earlyWarnings).values(record).onConflictDoUpdate({
    target: schema.earlyWarnings.id,
    set: record,
  })
  return c.json({ success: true, earlyWarning: body }, 201)
})

// ============================================================
// 7. Audit Logs & Referrals
// ============================================================
app.get('/api/audit-logs', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)
  const list = await database.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.timestamp)).limit(100)
  const normalized = list.map(l => ({
    ...l,
    createdAt: l.timestamp,
  }))
  return c.json({ logs: normalized })
})

app.post('/api/audit-logs', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()
  const auth = c.get('auth')!
  // Identity, time and IP come from the server, never from the client (no spoofing)
  const log = {
    id: `LOG${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
    userId: auth.userId,
    userName: auth.name,
    userRole: auth.role,
    action: String(body.action || 'unknown').slice(0, 64),
    description: String(body.description || '').slice(0, 2000),
    targetId: body.targetId ? String(body.targetId).slice(0, 128) : null,
    timestamp: new Date().toISOString(),
    ipAddress: clientIp(c),
  }

  await database.insert(schema.auditLogs).values(log)
  return c.json({ success: true, log: { ...log, createdAt: log.timestamp } }, 201)
})

// ============================================================
// 6.2 Cloudinary Documents & Media (D1 Registry)
// ============================================================
app.get('/api/documents', async (c) => {
  const database = db(c)
  if (!database) return c.json({ documents: [] })

  const studentId = c.req.query('studentId')
  let query = database.select().from(schema.documents).orderBy(desc(schema.documents.createdAt))
  if (studentId) {
    const list = await database.select().from(schema.documents).where(eq(schema.documents.studentId, studentId)).orderBy(desc(schema.documents.createdAt))
    return c.json({ documents: list })
  }
  const list = await query
  return c.json({ documents: list })
})

app.post('/api/documents', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json()
  const doc = {
    id: body.id || `DOC${Date.now()}`,
    studentId: body.studentId,
    title: body.title || body.documentName || 'Document',
    type: body.type || body.documentTypeId || 'general',
    status: (body.status === 'approved' || body.status === 'rejected' ? body.status : 'pending') as any,
    publicId: body.publicId || body.cloudinaryPublicId || 'local_pending',
    url: body.url || body.fileUrl || '',
    createdAt: body.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 19),
  }

  await database.insert(schema.documents).values(doc)
  return c.json({ success: true, document: doc }, 201)
})

app.delete('/api/documents/:id', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  await database.delete(schema.documents).where(eq(schema.documents.id, id))
  return c.json({ success: true, message: `Document ${id} deleted` })
})



// ============================================================
// 7. Multi-Key AI Governance (Cloudflare D1)
// ============================================================
app.get('/api/ai/keys', async (c) => {
  const database = db(c)
  if (!database) return c.json({ keys: [] })
  const list = await database.select().from(schema.aiApiKeys).orderBy(desc(schema.aiApiKeys.createdAt))
  
  // Return masked keys for security
  const safeList = list.map(item => ({
    id: item.id,
    name: item.name,
    isDefault: item.isDefault,
    provider: item.provider,
    model: item.model,
    status: item.status,
    createdAt: item.createdAt,
    lastTestedAt: item.lastTestedAt,
    maskedKey: item.key.length > 8 
      ? `${item.key.substring(0, 6)}...${item.key.substring(item.key.length - 4)}`
      : '••••••••',
  }))
  return c.json({ keys: safeList })
})

app.post('/api/ai/keys', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const body = await c.req.json<{ name?: string; key?: string; isDefault?: boolean }>()
  if (!body.key || !body.key.trim()) {
    return c.json({ error: 'API key string is required' }, 400)
  }

  const cleanKey = body.key.trim()
  const name = (body.name && body.name.trim()) || `Gemini Key ${new Date().toISOString().split('T')[0]}`

  // Check existing keys count
  const existing = await database.select().from(schema.aiApiKeys)
  const isFirstKey = existing.length === 0
  const makeDefault = isFirstKey || Boolean(body.isDefault)

  // If this key is default, reset all other keys isDefault to false
  if (makeDefault && existing.length > 0) {
    await database.update(schema.aiApiKeys).set({ isDefault: false })
  }

  const newKeyRecord = {
    id: `KEY_${Date.now()}`,
    name,
    key: cleanKey,
    isDefault: makeDefault,
    provider: 'Google Gemini',
    model: 'gemini-2.5-flash',
    status: 'active' as const,
    createdAt: new Date().toISOString().split('T')[0],
    lastTestedAt: null,
  }

  await database.insert(schema.aiApiKeys).values(newKeyRecord)
  return c.json({
    success: true,
    key: {
      ...newKeyRecord,
      maskedKey: cleanKey.length > 8
        ? `${cleanKey.substring(0, 6)}...${cleanKey.substring(cleanKey.length - 4)}`
        : '••••••••',
    }
  }, 201)
})

app.patch('/api/ai/keys/:id/default', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  
  // 1. Reset all keys to isDefault = false
  await database.update(schema.aiApiKeys).set({ isDefault: false })

  // 2. Set target key to isDefault = true
  await database.update(schema.aiApiKeys).set({ isDefault: true }).where(eq(schema.aiApiKeys.id, id))

  return c.json({ success: true, activeId: id })
})

app.delete('/api/ai/keys/:id', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  const target = await database.select().from(schema.aiApiKeys).where(eq(schema.aiApiKeys.id, id)).get()
  if (!target) return c.json({ error: 'Key not found' }, 404)

  const wasDefault = target.isDefault
  await database.delete(schema.aiApiKeys).where(eq(schema.aiApiKeys.id, id))

  // If the deleted key was default, promote the next available key to default
  if (wasDefault) {
    const remaining = await database.select().from(schema.aiApiKeys).orderBy(desc(schema.aiApiKeys.createdAt)).limit(1)
    if (remaining.length > 0) {
      await database.update(schema.aiApiKeys).set({ isDefault: true }).where(eq(schema.aiApiKeys.id, remaining[0].id))
    }
  }

  return c.json({ success: true })
})

app.post('/api/ai/keys/:id/test', async (c) => {
  const database = db(c)
  const id = c.req.param('id')
  
  let keyString = ''
  if (database) {
    const record = await database.select().from(schema.aiApiKeys).where(eq(schema.aiApiKeys.id, id)).get()
    if (record) {
      keyString = record.key
    }
  }

  if (!keyString) {
    return c.json({ success: false, error: 'Key not found' }, 404)
  }

  try {
    const trimmedKey = keyString.trim()
    let verified = false
    let activeModelName = 'Google Gemini'
    let detailedError = ''

    // Step 1: Query ListModels to see what models this key has access to
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, { headers: { 'x-goog-api-key': trimmedKey } })
      if (listRes.ok) {
        const listData = await listRes.json() as any
        const availableModels = (listData?.models || []).filter((m: any) =>
          Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')
        )

        if (availableModels.length > 0) {
          // Sort available models to try the best/latest models first (e.g. 3.6-flash, 2.0-flash, 1.5-flash)
          const sortedModels = [...availableModels].sort((a: any, b: any) => {
            const getScore = (name: string) => {
              if (name.includes('3.6-flash')) return 100
              if (name.includes('3-flash')) return 90
              if (name.includes('2.0-flash')) return 80
              if (name.includes('1.5-flash')) return 70
              if (name.includes('flash')) return 60
              if (name.includes('pro')) return 50
              return 10
            }
            return getScore(b.name) - getScore(a.name)
          })

          for (const model of sortedModels) {
            const modelName = model.name // e.g. "models/gemini-3.6-flash"
            const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent`

            const genRes = await fetch(generateUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': trimmedKey },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'Ping test. Reply with: OK' }] }],
              }),
            })

            if (genRes.ok) {
              verified = true
              activeModelName = `Google Gemini (${modelName.replace('models/', '')})`
              break
            } else {
              const errJson = await genRes.json().catch(() => ({})) as any
              detailedError = errJson?.error?.message || `HTTP ${genRes.status}: Failed to generate content with ${modelName}`
              if (genRes.status === 400 && (detailedError.includes('API_KEY_INVALID') || detailedError.includes('not valid'))) {
                break
              }
            }
          }
        } else {
          detailedError = 'No models supporting "generateContent" found for this API key. Make sure the Generative Language API is enabled in your Google Cloud Project.'
        }
      } else {
        const errJson = await listRes.json().catch(() => ({})) as any
        detailedError = errJson?.error?.message || `HTTP ${listRes.status}: Unable to list models for this key.`
      }
    } catch (e: any) {
      detailedError = e.message || 'Network error connecting to Google Gemini'
    }

    // Step 2: Fallback attempt with direct candidate URLs if ListModels had an issue
    if (!verified && !detailedError.includes('API_KEY_INVALID') && !detailedError.includes('not valid')) {
      const fallbackModels = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      ]

      for (const endpoint of fallbackModels) {
        try {
          const res = await fetch(`${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': trimmedKey },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping test. Reply with: OK' }] }] }),
          })
          if (res.ok) {
            verified = true
            const match = endpoint.match(/models\/([^:]+)/)
            activeModelName = `Google Gemini (${match ? match[1] : 'flash'})`
            break
          }
        } catch (_err) {}
      }
    }

    if (verified) {
      const now = new Date().toISOString()
      if (database) {
        await database.update(schema.aiApiKeys).set({ status: 'active', lastTestedAt: now }).where(eq(schema.aiApiKeys.id, id))
      }
      return c.json({ success: true, message: `${activeModelName} connection verified successfully!` })
    } else {
      if (database) {
        await database.update(schema.aiApiKeys).set({ status: 'rate_limited' }).where(eq(schema.aiApiKeys.id, id))
      }
      return c.json({ success: false, message: detailedError })
    }
  } catch (err: any) {
    return c.json({ success: false, message: err.message || 'Network error connecting to Google Gemini' })
  }
})

// ============================================================
// 8. POST /api/qa/ai-analyze: LLM Qualitative Retention Analysis
// ============================================================
app.post('/api/qa/ai-analyze', async (c) => {
  try {
    const body = await c.req.json<{
      mode?: 'strategic_synthesis' | 'chat_query' | 'case_diagnostic'
      cases?: Array<{
        id: string
        studentCode?: string
        academicYear?: string
        exitType: string
        reasonCode: string
        details: string
        advisorAssessment?: string
        studentVoiceFeedback?: string
      }>
      query?: string
      apiKey?: string
      language?: 'th' | 'en'
      systemInstruction?: string
      userPrompt?: string
    }>()

    const mode = body.mode || 'strategic_synthesis'
    const cases = body.cases || []
    const userQuery = body.query || ''
    const lang = body.language || 'th'
    const database = db(c)

    // 1. Determine active API key: direct override > D1 default key > env/header
    let apiKey = body.apiKey || c.req.header('x-gemini-key')
    if (!apiKey && database) {
      const activeDbKey = await database.select().from(schema.aiApiKeys).where(eq(schema.aiApiKeys.isDefault, true)).get()
      if (activeDbKey && activeDbKey.key) {
        apiKey = activeDbKey.key
      }
    }
    if (!apiKey) {
      apiKey = c.env?.GEMINI_API_KEY
    }

    // De-identify: Only pass sanitized academic context
    const sanitizedDataSummary = cases.map((item, idx) => {
      return `Case #${idx + 1} [Year: ${item.academicYear || 'N/A'} | Type: ${item.exitType} | Reason: ${item.reasonCode}]
- Student Stated Reason: "${item.details || 'N/A'}"
- Advisor Assessment: "${item.advisorAssessment || 'N/A'}"
- Student Survey Voice: "${item.studentVoiceFeedback || 'N/A'}"`
    }).join('\n\n')

    // If a Gemini API key is available, call Google Gemini (newest available model)
    if (apiKey && apiKey.trim().length > 10) {
      let systemInstruction = `You are an expert Higher Education Quality Assurance (QA) Analyst and Academic Retention Specialist advising the Program Chair and Dean under AUN-QA Criterion 6 (Student Support Services) and Criterion 8 (Retention & Dropout Rates).
All personal names have been stripped for PDPA compliance. Analyze the qualitative data deeply.
Respond in ${lang === 'th' ? 'Thai with professional academic tone and clear markdown bullet points' : 'English with professional academic tone and clear markdown bullet points'}.`

      let userPrompt = ''
      if (mode === 'strategic_synthesis') {
        userPrompt = `Analyze the following student exit cases (Withdrawal / Resignation vs. Leave of Absence):

${sanitizedDataSummary}

Please deliver a comprehensive Qualitative QA Synthesis containing:
1. **Executive Summary (บทสรุปสำหรับประธานหลักสูตร)**: Key patterns and primary differences between Permanent Withdrawals and Temporary Leaves of Absence.
2. **Top 3 Root Causes (3 สาเหตุรากเหง้าเชิงลึก)**: Detail how curriculum pacing, mental burnout, or family obligations drove these decisions.
3. **Curriculum & Teaching Impacts (ผลกระทบต่อการจัดการเรียนการสอน)**: Specifically analyzing Term 1 foundation courses (e.g. Programming/Calculus).
4. **Actionable CQI Recommendations (ข้อเสนอแนะเชิงมาตรการตามเกณฑ์ AUN-QA)**: Concrete 0-3 month and 1-year intervention plans to boost retention.`
      } else if (mode === 'case_diagnostic') {
        userPrompt = `Perform a deep qualitative diagnostic analysis for this specific student departure case:

${sanitizedDataSummary}

Please provide:
1. **Root Cause Diagnosis (การวินิจฉัยสาเหตุแท้จริง)**: Contrast student stated reason vs underlying factors.
2. **Intervention Feasibility (การประเมินความเป็นไปได้ในการช่วยเหลือ/ชะลอการออก)**
3. **Re-entry or Retention Action Plan (ข้อเสนอแนะสู่อาจารย์ที่ปรึกษาและหลักสูตร)**`
      } else {
        userPrompt = `Based on the following student exit data:

${sanitizedDataSummary}

Please answer the Program Chair's question:
"${userQuery}"

Provide a concise, evidence-based academic response with clear takeaways for curriculum improvement.`
      }

      // The client shows the user the exact prompt before analysis; use it verbatim when provided
      const MAX_PROMPT_CHARS = 100_000
      if (
        typeof body.systemInstruction === 'string' && body.systemInstruction.length <= MAX_PROMPT_CHARS &&
        typeof body.userPrompt === 'string' && body.userPrompt.trim() && body.userPrompt.length <= MAX_PROMPT_CHARS
      ) {
        systemInstruction = body.systemInstruction
        userPrompt = body.userPrompt
      }

      const candidateEndpoints = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      ]

      const payload = {
        contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }

      // Last provider error, reported back instead of silently returning canned fallback text
      let lastError = ''
      const readGeminiError = async (res: Response) => {
        const errData = await res.json().catch(() => null) as any
        lastError = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`
      }

      for (const endpoint of candidateEndpoints) {
        try {
          const geminiUrl = `${endpoint}`
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
            body: JSON.stringify(payload),
          })

          if (response.ok) {
            const data = await response.json() as any
            const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (textContent) {
              const match = endpoint.match(/models\/([^:]+)/)
              const modelTag = match ? match[1] : 'gemini'
              return c.json({
                success: true,
                provider: `Google Gemini (${modelTag}) (D1 Active Cloud Key)`,
                mode,
                analysis: textContent,
                timestamp: new Date().toISOString(),
              })
            }
          } else {
            await readGeminiError(response)
          }
        } catch (err: any) {
          lastError = err?.message || 'Network error'
        }
      }

      // Dynamic model fallback via listModels
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, { headers: { 'x-goog-api-key': apiKey.trim() } })
        if (!listRes.ok) await readGeminiError(listRes)
        if (listRes.ok) {
          const listData = await listRes.json() as any
          const models = (listData?.models || []).filter((m: any) => 
            Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent')
          )
          
          const sortedModels = [...models].sort((a: any, b: any) => {
            const getScore = (name: string) => {
              if (name.includes('3.6-flash')) return 100
              if (name.includes('3-flash')) return 90
              if (name.includes('2.0-flash')) return 80
              if (name.includes('1.5-flash')) return 70
              if (name.includes('flash')) return 60
              if (name.includes('pro')) return 50
              return 10
            }
            return getScore(b.name) - getScore(a.name)
          })

          for (const m of sortedModels) {
            const dynamicUrl = `https://generativelanguage.googleapis.com/v1beta/${m.name}:generateContent`
            const dynRes = await fetch(dynamicUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey.trim() },
              body: JSON.stringify(payload),
            })
            if (dynRes.ok) {
              const data = await dynRes.json() as any
              const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text
              if (textContent) {
                return c.json({
                  success: true,
                  provider: `Google Gemini (${m.name.replace('models/', '')}) (D1 Active Cloud Key)`,
                  mode,
                  analysis: textContent,
                  timestamp: new Date().toISOString(),
                })
              }
            } else {
              await readGeminiError(dynRes)
            }
          }
        }
      } catch (err: any) {
        lastError = err?.message || lastError || 'Network error'
      }

      // A key is configured but every call failed: say so instead of returning canned text
      const safeError = (lastError || 'No Gemini model accepted the request').split(apiKey.trim()).join('***')
      return c.json({
        success: false,
        provider: 'Google Gemini (Default API key)',
        mode,
        analysis: lang === 'th'
          ? `⚠️ เรียกใช้ Gemini ด้วยคีย์ API เริ่มต้นไม่สำเร็จ: ${safeError}\n\nกรุณาแจ้งผู้ดูแลระบบให้ตรวจสอบคีย์ API ในหน้า AI Governance`
          : `⚠️ The default API key failed with Gemini: ${safeError}\n\nPlease ask the Admin to check the API key in AI Governance.`,
        error: 'GEMINI_API_ERROR',
        timestamp: new Date().toISOString(),
      })
    }

    // No default API key configured: report it instead of returning canned text
    return c.json({
      success: false,
      provider: 'Default API key',
      mode,
      analysis: lang === 'th'
        ? '⚠️ ยังไม่มีคีย์ API เริ่มต้น กรุณาแจ้งผู้ดูแลระบบให้เพิ่มคีย์ API ในหน้า AI Governance หรือใช้คีย์ API ของคุณเอง'
        : '⚠️ No default API key is set. Please ask the Admin to add one in AI Governance, or use your own API key.',
      error: 'NO_DEFAULT_API_KEY',
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return c.json({
      success: false,
      error: err.message || 'Failed to process AI analysis',
    }, 500)
  }
})

// ============================================================
// 15. Advising Category Configuration (Cloudflare D1)
// ============================================================

const categorySchema = z.object({
  id: z.string().optional(),
  value: z.string().min(1),
  label: z.string().optional(),
  labelTh: z.string().optional(),
  labelEn: z.string().optional(),
  subCategories: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
})

app.get('/api/categories', async (c) => {
  try {
    const database = db(c)
    if (!database) {
      return c.json({ error: 'Database unavailable' }, 503)
    }
    const cats = await database.select().from(schema.advisingCategoryConfigs).all()
    const formatted = cats.map(cat => ({
      id: cat.id,
      value: cat.value,
      label: cat.labelEn || cat.labelTh || cat.value,
      labelTh: cat.labelTh,
      labelEn: cat.labelEn,
      subCategories: typeof cat.subCategories === 'string' ? JSON.parse(cat.subCategories || '[]') : (cat.subCategories || []),
      isActive: cat.isActive,
    }))
    return c.json({ success: true, categories: formatted })
  } catch (err) {
    console.error('Failed to get categories from D1:', err)
    return c.json({ error: 'Database unavailable' }, 503)
  }
})

app.post('/api/categories', async (c) => {
  const database = db(c)
  const body = await c.req.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid category data', details: parsed.error.format() }, 400)
  }
  const labelTh = parsed.data.labelTh || parsed.data.label || parsed.data.value
  const labelEn = parsed.data.labelEn || parsed.data.label || parsed.data.value
  const newCat = {
    id: body.id || `CAT${Date.now()}`,
    value: parsed.data.value,
    labelTh,
    labelEn,
    subCategories: JSON.stringify(parsed.data.subCategories),
    isActive: parsed.data.isActive,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (database) {
    await database.insert(schema.advisingCategoryConfigs).values(newCat).onConflictDoUpdate({
      target: schema.advisingCategoryConfigs.id,
      set: newCat,
    })
  }
  return c.json({ success: true, category: { ...newCat, label: labelEn, subCategories: parsed.data.subCategories } }, 201)
})

app.put('/api/categories/:id', async (c) => {
  const database = db(c)
  const id = c.req.param('id')
  const body = await c.req.json()
  const updates: any = { updatedAt: new Date().toISOString() }
  if (body.value !== undefined) updates.value = body.value
  if (body.labelTh !== undefined) updates.labelTh = body.labelTh
  if (body.labelEn !== undefined) updates.labelEn = body.labelEn
  if (body.label !== undefined && !body.labelEn) updates.labelEn = body.label
  if (body.subCategories !== undefined) updates.subCategories = JSON.stringify(body.subCategories)
  if (body.isActive !== undefined) updates.isActive = body.isActive

  if (database) {
    await database.update(schema.advisingCategoryConfigs).set(updates).where(eq(schema.advisingCategoryConfigs.id, id))
  }
  return c.json({ success: true, message: 'Category updated' })
})

app.delete('/api/categories/:id', async (c) => {
  const database = db(c)
  const id = c.req.param('id')
  if (database) {
    await database.delete(schema.advisingCategoryConfigs).where(eq(schema.advisingCategoryConfigs.id, id))
  }
  return c.json({ success: true, message: 'Category deleted' })
})

// ============================================================
// 16. Document Type Configuration (Cloudflare D1)
// ============================================================

const documentTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  signatureMethod: z.enum(['wet_signature', 'e_signature', 'none']).optional(),
  label: z.string().optional(),
  labelTh: z.string().optional(),
  labelEn: z.string().optional(),
  templateFileUrl: z.string().optional(),
  templateFileName: z.string().optional(),
  templatePublicId: z.string().optional(),
  allowedFormats: z.array(z.string()).default(['PDF', 'JPG', 'PNG']),
  maxSizeMb: z.number().default(10),
  isRequired: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

app.get('/api/document-types', async (c) => {
  const database = db(c)
  if (!database) {
    return c.json({ error: 'Database unavailable' }, 503)
  }
  const dts = await database.select().from(schema.documentTypeConfigs).all()
  const formatted = dts.map(d => {
    let sig: 'wet_signature' | 'e_signature' | 'none' = 'wet_signature'
    let templateFileUrl: string | undefined
    let templateFileName: string | undefined
    let templatePublicId: string | undefined
    try {
      const parsed = JSON.parse(d.allowedFormats || '[]')
      if (Array.isArray(parsed)) {
        const foundSig = parsed.find((item: string) => typeof item === 'string' && item.startsWith('sig:'))
        if (foundSig) sig = foundSig.replace('sig:', '') as any
        const foundUrl = parsed.find((item: string) => typeof item === 'string' && item.startsWith('tplUrl:'))
        if (foundUrl) templateFileUrl = foundUrl.replace('tplUrl:', '')
        const foundName = parsed.find((item: string) => typeof item === 'string' && item.startsWith('tplName:'))
        if (foundName) templateFileName = foundName.replace('tplName:', '')
        const foundPid = parsed.find((item: string) => typeof item === 'string' && item.startsWith('tplPid:'))
        if (foundPid) templatePublicId = foundPid.replace('tplPid:', '')
      }
    } catch {}
    return {
      id: d.id,
      name: d.name,
      signatureMethod: sig,
      templateFileUrl,
      templateFileName,
      templatePublicId,
      labelTh: d.labelTh,
      labelEn: d.labelEn,
      allowedFormats: typeof d.allowedFormats === 'string' ? JSON.parse(d.allowedFormats || '[]') : (d.allowedFormats || []),
      isActive: d.isActive,
      isRequired: d.isRequired,
    }
  })
  return c.json({ success: true, documentTypes: formatted })
})

app.post('/api/document-types', async (c) => {
  const database = db(c)
  const body = await c.req.json()
  const parsed = documentTypeSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: 'Invalid document type data', details: parsed.error.format() }, 400)
  }
  const sig = parsed.data.signatureMethod || 'wet_signature'
  const extraTags = [`sig:${sig}`]
  if (body.templateFileUrl) extraTags.push(`tplUrl:${body.templateFileUrl}`)
  if (body.templateFileName) extraTags.push(`tplName:${body.templateFileName}`)
  if (body.templatePublicId) extraTags.push(`tplPid:${body.templatePublicId}`)
  const newDt = {
    id: body.id || `DT${Date.now()}`,
    name: parsed.data.name,
    labelTh: parsed.data.labelTh || parsed.data.label || parsed.data.name,
    labelEn: parsed.data.labelEn || parsed.data.label || parsed.data.name,
    allowedFormats: JSON.stringify(['PDF', ...extraTags]),
    maxSizeMb: parsed.data.maxSizeMb,
    isRequired: parsed.data.isRequired,
    isActive: parsed.data.isActive,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (database) {
    await database.insert(schema.documentTypeConfigs).values(newDt).onConflictDoUpdate({
      target: schema.documentTypeConfigs.id,
      set: newDt,
    })
  }
  return c.json({ 
    success: true, 
    documentType: { 
      id: newDt.id, 
      name: newDt.name, 
      signatureMethod: sig, 
      templateFileUrl: body.templateFileUrl,
      templateFileName: body.templateFileName,
      templatePublicId: body.templatePublicId,
      isActive: newDt.isActive 
    } 
  }, 201)
})

app.put('/api/document-types/:id', async (c) => {
  const database = db(c)
  const id = c.req.param('id')
  const body = await c.req.json()
  const updates: any = { updatedAt: new Date().toISOString() }
  if (body.name !== undefined) updates.name = body.name
  if (body.labelTh !== undefined) updates.labelTh = body.labelTh
  if (body.labelEn !== undefined) updates.labelEn = body.labelEn
  if (body.signatureMethod !== undefined || body.templateFileUrl !== undefined) {
    const sig = body.signatureMethod || 'wet_signature'
    const extraTags = [`sig:${sig}`]
    if (body.templateFileUrl) extraTags.push(`tplUrl:${body.templateFileUrl}`)
    if (body.templateFileName) extraTags.push(`tplName:${body.templateFileName}`)
    if (body.templatePublicId) extraTags.push(`tplPid:${body.templatePublicId}`)
    updates.allowedFormats = JSON.stringify(['PDF', ...extraTags])
  }
  if (body.isActive !== undefined) updates.isActive = body.isActive

  if (database) {
    await database.update(schema.documentTypeConfigs).set(updates).where(eq(schema.documentTypeConfigs.id, id))
  }
  return c.json({ success: true, message: 'Document type updated' })
})

app.delete('/api/document-types/:id', async (c) => {
  const database = db(c)
  const id = c.req.param('id')
  if (database) {
    await database.delete(schema.documentTypeConfigs).where(eq(schema.documentTypeConfigs.id, id))
  }
  return c.json({ success: true, message: 'Document type deleted' })
})

export default app
