// ============================================================
// AdvisingLog — Authentication & Role Authorization
// - Google sign-in is verified server-side with Google (token audience, expiry, verified email)
// - Sessions are HS256-signed tokens (WebCrypto, no extra dependencies)
// - Every /api route is mapped to the roles allowed to call it; unmapped routes are denied
// ============================================================

export type Role = 'student' | 'advisor' | 'qa_chair' | 'admin' | 'super_admin'

export interface SessionClaims {
  sub: string
  email: string
  name: string
  role: Role
  iat: number
  exp: number
}

export const SESSION_TTL_SECONDS = 8 * 60 * 60

/** Roles a user may switch into. Mirrors frontend getAvailableRolesForUser. */
export function allowedRolesFor(baseRole: Role): Role[] {
  switch (baseRole) {
    case 'student': return ['student']
    case 'advisor':
    case 'qa_chair': return ['advisor', 'qa_chair']
    case 'admin': return ['admin', 'qa_chair', 'advisor']
    case 'super_admin': return ['super_admin', 'admin', 'qa_chair', 'advisor']
    default: return [baseRole]
  }
}

// ---------------------------------------------------------------
// Google sign-in verification
// ---------------------------------------------------------------

export interface GoogleIdentity {
  email: string
  name?: string
  picture?: string
  sub: string
}

export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

/**
 * Verifies a Google OAuth access token with Google and returns the signed-in identity.
 * Rejects tokens issued to a different app (audience), expired tokens, and unverified emails.
 */
export async function verifyGoogleAccessToken(accessToken: string, clientId: string): Promise<GoogleIdentity> {
  const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`)
  if (!infoRes.ok) {
    throw new AuthError('GOOGLE_TOKEN_INVALID', 'Google sign-in token is invalid or expired')
  }
  const info = await infoRes.json() as Record<string, string>

  if (info.aud !== clientId && info.azp !== clientId) {
    throw new AuthError('GOOGLE_TOKEN_WRONG_AUDIENCE', 'Google sign-in token was not issued for this application')
  }
  if (Number(info.expires_in || 0) <= 0) {
    throw new AuthError('GOOGLE_TOKEN_INVALID', 'Google sign-in token has expired')
  }
  if (!info.email || String(info.email_verified) !== 'true') {
    throw new AuthError('GOOGLE_EMAIL_UNVERIFIED', 'Google account email is not verified')
  }

  // Profile details (name/picture) come from userinfo; identity fields come from tokeninfo above
  let name: string | undefined
  let picture: string | undefined
  try {
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (profileRes.ok) {
      const profile = await profileRes.json() as Record<string, string>
      name = profile.name
      picture = profile.picture
    }
  } catch {}

  return { email: info.email.toLowerCase().trim(), name, picture, sub: info.sub || info.user_id || '' }
}

// ---------------------------------------------------------------
// Session tokens (HS256)
// ---------------------------------------------------------------

const encoder = new TextEncoder()

function base64UrlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4)
  const binary = atob(b64)
  return Uint8Array.from(binary, ch => ch.charCodeAt(0))
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signSession(
  claims: Omit<SessionClaims, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds = SESSION_TTL_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64UrlEncode(JSON.stringify({ ...claims, iat: now, exp: now + ttlSeconds }))
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(`${header}.${payload}`))
  return `${header}.${payload}.${base64UrlEncode(new Uint8Array(signature))}`
}

/** Returns the claims if the token is genuine and unexpired, otherwise null. */
export async function verifySession(token: string, secret: string): Promise<SessionClaims | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  try {
    const headerJson = JSON.parse(new TextDecoder().decode(base64UrlDecode(header)))
    if (headerJson.alg !== 'HS256') return null
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      base64UrlDecode(signature),
      encoder.encode(`${header}.${payload}`)
    )
    if (!valid) return null
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as SessionClaims
    if (!claims.sub || !claims.role || typeof claims.exp !== 'number') return null
    if (claims.exp <= Math.floor(Date.now() / 1000)) return null
    return claims
  } catch {
    return null
  }
}

// ---------------------------------------------------------------
// Route → role rules (deny by default)
// ---------------------------------------------------------------

const ALL: Role[] = ['student', 'advisor', 'qa_chair', 'admin', 'super_admin']
const ADMINS: Role[] = ['admin', 'super_admin']

const ROUTE_RULES: Array<[method: string, path: RegExp, roles: Role[]]> = [
  // Shared reads (record-level scoping per user is phase 2)
  ['GET', /^\/api\/(users|users\/[^/]+|roster|requests|appointments|sessions|follow-ups|follow-up-progress|exit-cases|student-voice|early-warnings|documents|categories|document-types)$/, ALL],

  // Users & roster: advisors may only manage student accounts (enforced in the routes)
  ['POST', /^\/api\/users(\/bulk)?$/, ['advisor', ...ADMINS]],
  ['PATCH', /^\/api\/users\/[^/]+$/, ['advisor', ...ADMINS]],
  ['DELETE', /^\/api\/users\/[^/]+$/, ADMINS],
  ['POST', /^\/api\/roster$/, ['advisor', ...ADMINS]],

  // Advising workflow
  ['POST', /^\/api\/requests$/, ['student']],
  ['PATCH', /^\/api\/requests\/[^/]+\/status$/, ['student', 'advisor', ...ADMINS]],
  ['DELETE', /^\/api\/requests\/[^/]+$/, ADMINS],
  ['POST', /^\/api\/appointments$/, ['advisor']],
  ['PATCH', /^\/api\/appointments\/[^/]+\/status$/, ['student', 'advisor']],
  ['POST', /^\/api\/sessions$/, ['advisor']],
  ['POST', /^\/api\/follow-ups$/, ['advisor']],
  ['PATCH', /^\/api\/follow-ups\/[^/]+\/status$/, ['student', 'advisor']],
  ['POST', /^\/api\/follow-up-progress$/, ['student', 'advisor']],
  ['POST', /^\/api\/exit-cases$/, ['student', 'advisor']],
  ['PATCH', /^\/api\/exit-cases\/[^/]+$/, ['advisor', 'qa_chair', ...ADMINS]],
  ['POST', /^\/api\/student-voice$/, ['student']],
  ['POST', /^\/api\/early-warnings$/, ['advisor']],
  ['POST', /^\/api\/documents$/, ['student', 'advisor']],
  ['DELETE', /^\/api\/documents\/[^/]+$/, ['student', 'advisor', ...ADMINS]],

  // Audit logs: anyone may append (identity is taken from the session), only admins may read
  ['POST', /^\/api\/audit-logs$/, ALL],
  ['GET', /^\/api\/audit-logs$/, ADMINS],

  // AI
  ['POST', /^\/api\/qa\/ai-analyze$/, ['qa_chair']],
  ['GET', /^\/api\/ai\/keys$/, ADMINS],
  ['POST', /^\/api\/ai\/keys$/, ADMINS],
  ['PATCH', /^\/api\/ai\/keys\/[^/]+\/default$/, ADMINS],
  ['DELETE', /^\/api\/ai\/keys\/[^/]+$/, ADMINS],
  ['POST', /^\/api\/ai\/keys\/[^/]+\/test$/, ADMINS],

  // Admin configuration
  ['POST', /^\/api\/(categories|document-types)$/, ADMINS],
  ['PUT', /^\/api\/(categories|document-types)\/[^/]+$/, ADMINS],
  ['DELETE', /^\/api\/(categories|document-types)\/[^/]+$/, ADMINS],
]

/** Roles allowed for a request, or null if the route is not mapped (denied). */
export function rolesForRoute(method: string, path: string): Role[] | null {
  for (const [m, re, roles] of ROUTE_RULES) {
    if (m === method && re.test(path)) return roles
  }
  return null
}
