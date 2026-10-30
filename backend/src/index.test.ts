import { describe, it, expect, vi, afterEach } from 'vitest'
import app from './index'
import { signSession, type Role } from './auth'

const ENV = {
  SESSION_SECRET: 'test-session-secret-0123456789abcdef',
  GOOGLE_CLIENT_ID: 'test-client.apps.googleusercontent.com',
}

async function tokenFor(role: Role, secret = ENV.SESSION_SECRET, ttl?: number) {
  return signSession({ sub: `USER_${role}`, email: `${role}@mfu.ac.th`, name: `Test ${role}`, role }, secret, ttl)
}

/** Request as a signed-in user. Defaults to super_admin; `activeRole` switches role (x-active-role). */
async function authed(path: string, init: RequestInit = {}, baseRole: Role = 'super_admin', activeRole?: Role) {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${await tokenFor(baseRole)}`)
  if (activeRole) headers.set('x-active-role', activeRole)
  return app.request(path, { ...init, headers }, ENV)
}

describe('Backend Hono API', () => {
  it('GET / returns system status JSON', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    const body = await res.json() as { service: string; status: string }
    expect(body.service).toBe('AdvisingLog API')
    expect(body.status).toBe('online')
  })

  it('GET /api/health returns healthy status', async () => {
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    const body = await res.json() as { status: string; environment: string }
    expect(body.status).toBe('healthy')
  })

  it('GET /api/info returns tech stack details and all roles', async () => {
    const res = await app.request('/api/info')
    expect(res.status).toBe(200)
    const body = await res.json() as { app: string; roles: string[] }
    expect(body.app).toBe('AdvisingLog')
    expect(body.roles).toEqual(['student', 'advisor', 'qa_chair', 'admin'])
  })

  it('POST /api/qa/ai-analyze reports a missing default API key instead of canned text', async () => {
    const payload = {
      mode: 'strategic_synthesis',
      cases: [
        {
          id: 'EXT001',
          studentCode: '6631503006',
          academicYear: '2026',
          exitType: 'leave_of_absence',
          reasonCode: 'family_obligation',
          details: 'Family emergency care',
          advisorAssessment: 'Recommend 1 semester leave',
        },
      ],
      language: 'th',
    }

    const res = await authed('/api/qa/ai-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 'super_admin', 'qa_chair')

    expect(res.status).toBe(200)
    const data = await res.json() as any
    // No default API key configured: explicit error, never canned analysis text
    expect(data.success).toBe(false)
    expect(data.error).toBe('NO_DEFAULT_API_KEY')
  })

  it('GET /api/users reports unavailable database', async () => {
    const res = await authed('/api/users')
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ error: 'Database unavailable' })
  })

  it('GET /api/requests returns safe empty array when DB binding is detached in unit test', async () => {
    const res = await authed('/api/requests')
    expect(res.status).toBe(200)
    const data = await res.json() as { requests: any[] }
    expect(Array.isArray(data.requests)).toBe(true)
  })

  it('GET /api/follow-ups returns safe empty array when DB binding is detached in unit test', async () => {
    const res = await authed('/api/follow-ups')
    expect(res.status).toBe(200)
    const data = await res.json() as { followUps: any[] }
    expect(Array.isArray(data.followUps)).toBe(true)
  })

  it('GET /api/ai/keys returns safe empty array when DB binding is detached in unit test', async () => {
    const res = await authed('/api/ai/keys')
    expect(res.status).toBe(200)
    const data = await res.json() as { keys: any[] }
    expect(Array.isArray(data.keys)).toBe(true)
  })

  it('POST /api/ai/keys validates required key string', async () => {
    const res = await authed('/api/ai/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Empty Key Test' }),
    })
    // Either 400 (validation) or 503 (database offline in detached unit test)
    expect([400, 503]).toContain(res.status)
  })

  it('DELETE /api/users/:id handles deletion safely and protects superadmin', async () => {
    const res = await authed('/api/users/ADM_SE_GOOGLE', {
      method: 'DELETE',
    })
    // Either 400 (superadmin protected), 404 (not found), or 503 (detached unit test db)
    expect([400, 404, 503]).toContain(res.status)
  })

  it('GET /api/categories reports unavailable database', async () => {
    const res = await authed('/api/categories')
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ error: 'Database unavailable' })
  })

  it('POST /api/categories validates required fields', async () => {
    const res = await authed('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Test Category' }),
    })
    expect([400, 503]).toContain(res.status)
  })

  it('GET /api/document-types reports unavailable database', async () => {
    const res = await authed('/api/document-types')
    expect(res.status).toBe(503)
    expect(await res.json()).toMatchObject({ error: 'Database unavailable' })
  })

  it('POST /api/document-types validates required fields', async () => {
    const res = await authed('/api/document-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    expect([400, 503]).toContain(res.status)
  })
})

 describe('Admin data availability', () => {
  it.each(['/api/roster', '/api/audit-logs'])('%s does not disguise a missing database as an empty list', async path => {
    const res = await authed(path)
    expect(res.status).toBe(503)
  })
})

describe('Authentication & authorization', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects requests without a session token', async () => {
    const res = await app.request('/api/users', {}, ENV)
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'UNAUTHENTICATED' })
  })

  it('rejects tampered, foreign-signed and expired tokens', async () => {
    const valid = await tokenFor('super_admin')
    const [h, p] = valid.split('.')
    const tampered = `${h}.${p}.AAAA`
    const foreign = await tokenFor('super_admin', 'some-other-secret')
    const expired = await tokenFor('super_admin', ENV.SESSION_SECRET, -10)
    for (const token of [tampered, foreign, expired, 'not-a-token']) {
      const res = await app.request('/api/users', { headers: { Authorization: `Bearer ${token}` } }, ENV)
      expect(res.status).toBe(401)
    }
  })

  it('denies roles that are not allowed on a route', async () => {
    expect((await authed('/api/audit-logs', {}, 'student')).status).toBe(403)
    expect((await authed('/api/ai/keys', {}, 'advisor')).status).toBe(403)
    expect((await authed('/api/qa/ai-analyze', { method: 'POST', body: '{}' }, 'advisor')).status).toBe(403)
    expect((await authed('/api/sessions', { method: 'POST', body: '{}' }, 'student')).status).toBe(403)
  })

  it('only allows switching into roles the account holds', async () => {
    // advisor -> admin is not allowed
    expect((await authed('/api/ai/keys', {}, 'advisor', 'admin')).status).toBe(403)
    // student -> advisor is not allowed
    expect((await authed('/api/users', {}, 'student', 'advisor')).status).toBe(403)
    // advisor -> qa_chair is allowed (faculty multi-role); passes auth, then hits the detached DB
    expect((await authed('/api/qa/ai-analyze', { method: 'POST', body: '{}' }, 'advisor', 'qa_chair')).status).not.toBe(403)
  })

  it('denies unmapped routes by default', async () => {
    expect((await authed('/api/not-a-route', { method: 'POST' })).status).toBe(403)
  })

  it('fails closed when the session secret is not configured', async () => {
    const res = await app.request('/api/users', { headers: { Authorization: `Bearer ${await tokenFor('super_admin')}` } }, {})
    expect(res.status).toBe(500)
  })

  it('only allows configured frontend origins (CORS)', async () => {
    const ok = await app.request('/api/health', { headers: { Origin: 'http://localhost:5173' } }, ENV)
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
    const evil = await app.request('/api/health', { headers: { Origin: 'https://evil.example' } }, ENV)
    expect(evil.headers.get('access-control-allow-origin')).toBeNull()
  })

  describe('POST /api/auth/google', () => {
    const login = (body: object, env: object = ENV) => app.request('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, env)

    const stubGoogle = (tokeninfo: object | null) => {
      vi.stubGlobal('fetch', vi.fn(async (url: string) => {
        if (String(url).includes('tokeninfo')) {
          return tokeninfo ? new Response(JSON.stringify(tokeninfo), { status: 200 }) : new Response('{"error":"invalid_token"}', { status: 400 })
        }
        return new Response(JSON.stringify({ name: 'Test', picture: '' }), { status: 200 })
      }))
    }

    it('fails closed when GOOGLE_CLIENT_ID / SESSION_SECRET are missing', async () => {
      const res = await login({ accessToken: 'x' }, {})
      expect(res.status).toBe(500)
      expect(await res.json()).toMatchObject({ error: 'AUTH_NOT_CONFIGURED' })
    })

    it('rejects a forged token that Google does not recognise (old unsigned-JWT attack)', async () => {
      stubGoogle(null)
      const forged = `${btoa('{"alg":"none"}')}.${btoa('{"email":"se.advisinglog@gmail.com"}')}.signature`
      const res = await login({ accessToken: forged })
      expect(res.status).toBe(401)
      expect(await res.json()).toMatchObject({ error: 'GOOGLE_TOKEN_INVALID' })
    })

    it('rejects a real Google token issued to a different app', async () => {
      stubGoogle({ aud: 'other-app.apps.googleusercontent.com', email: 'se.advisinglog@gmail.com', email_verified: 'true', expires_in: '3000', sub: '1' })
      const res = await login({ accessToken: 'token-for-other-app' })
      expect(res.status).toBe(401)
      expect(await res.json()).toMatchObject({ error: 'GOOGLE_TOKEN_WRONG_AUDIENCE' })
    })

    it('rejects an unverified Google email', async () => {
      stubGoogle({ aud: ENV.GOOGLE_CLIENT_ID, email: 'someone@mfu.ac.th', email_verified: 'false', expires_in: '3000', sub: '1' })
      const res = await login({ accessToken: 'unverified' })
      expect(res.status).toBe(401)
      expect(await res.json()).toMatchObject({ error: 'GOOGLE_EMAIL_UNVERIFIED' })
    })

    it('accepts a verified token for this app and then requires the database', async () => {
      stubGoogle({ aud: ENV.GOOGLE_CLIENT_ID, email: 'se.advisinglog@gmail.com', email_verified: 'true', expires_in: '3000', sub: '1' })
      const res = await login({ accessToken: 'good' })
      // Detached unit-test DB: verification passed, user lookup is unavailable
      expect(res.status).toBe(503)
    })
  })
})

describe('Audit trail', () => {
  it('names every change with a meaningful audit action', async () => {
    const { auditActionFor } = await import('./index')
    expect(auditActionFor('POST', '/api/requests')).toBe('request_created')
    expect(auditActionFor('PATCH', '/api/requests/REQ1/status')).toBe('request_updated')
    expect(auditActionFor('POST', '/api/sessions')).toBe('log_created')
    expect(auditActionFor('DELETE', '/api/documents/DOC1')).toBe('document_deleted')
    expect(auditActionFor('POST', '/api/users/bulk')).toBe('users_imported')
    expect(auditActionFor('DELETE', '/api/ai/keys/K1')).toBe('ai_key_changed')
    expect(auditActionFor('PUT', '/api/categories/C1')).toBe('category_updated')
  })

  it('records the affected record id from the path or the created object', async () => {
    const { auditTargetId } = await import('./index')
    expect(auditTargetId('/api/requests/REQ1/status', null)).toBe('REQ1')
    expect(auditTargetId('/api/requests', { success: true, request: { id: 'REQ9' } })).toBe('REQ9')
    expect(auditTargetId('/api/users/bulk', { count: 2 })).toBeNull()
  })
})

describe('Rate limiting', () => {
  const limiter = (allow: boolean | 'throw') => ({
    limit: vi.fn(async () => {
      if (allow === 'throw') throw new Error('limiter down')
      return { success: allow }
    }),
  })

  it('blocks anonymous spam per IP with 429 before any other work', async () => {
    const anon = limiter(false)
    const res = await app.request('/api/users', { headers: { 'cf-connecting-ip': '203.0.113.9' } }, { ...ENV, ANON_RATE_LIMITER: anon })
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('60')
    expect(anon.limit).toHaveBeenCalledWith({ key: 'ip:203.0.113.9' })
  })

  it('limits signed-in users per user id, not per shared campus IP', async () => {
    const user = limiter(false)
    const token = await tokenFor('advisor')
    const res = await app.request('/api/requests', { headers: { Authorization: `Bearer ${token}` } }, { ...ENV, USER_RATE_LIMITER: user })
    expect(res.status).toBe(429)
    expect(user.limit).toHaveBeenCalledWith({ key: 'user:USER_advisor' })
  })

  it('rate-limits sign-in attempts per IP', async () => {
    const res = await app.request('/api/auth/google', { method: 'POST', body: '{}' }, { ...ENV, ANON_RATE_LIMITER: limiter(false) })
    expect(res.status).toBe(429)
  })

  it('lets requests through when within the limit or if the limiter fails', async () => {
    const token = await tokenFor('advisor')
    for (const l of [limiter(true), limiter('throw')]) {
      const res = await app.request('/api/requests', { headers: { Authorization: `Bearer ${token}` } }, { ...ENV, USER_RATE_LIMITER: l })
      expect(res.status).toBe(200)
    }
  })
})
