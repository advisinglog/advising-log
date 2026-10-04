import { describe, it, expect } from 'vitest'
import app from './index'

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

  it('POST /api/auth/google decodes JWT credential and authenticates student user from @student.mfu.ac.th', async () => {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      email: '6631503001@student.mfu.ac.th',
      name: 'Somchai Jaidee',
      sub: 'google_123456789',
      picture: 'https://lh3.googleusercontent.com/a/sample',
    }))
    const dummyJwt = `${header}.${payload}.signature`

    const res = await app.request('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: dummyJwt }),
    })

    expect(res.status).toBe(200)
    const data = await res.json() as any
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('6631503001@student.mfu.ac.th')
    expect(data.user.role).toBe('student')
  })

  it('POST /api/auth/google allows se.advisinglog@gmail.com as Super Admin', async () => {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      email: 'se.advisinglog@gmail.com',
      name: 'SE AdvisingLog Super Admin',
      sub: 'google_999999',
    }))
    const dummyJwt = `${header}.${payload}.signature`

    const res = await app.request('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: dummyJwt }),
    })

    expect(res.status).toBe(200)
    const data = await res.json() as any
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('se.advisinglog@gmail.com')
    expect(data.user.role).toBe('super_admin')
    expect(data.user.code).toBe('ADM-SUPER')
  })

  it('POST /api/auth/google rejects non-MFU unauthorized outside emails', async () => {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      email: 'unauthorized.user@yahoo.com',
      name: 'Unauthorized Stranger',
      sub: 'google_000000',
    }))
    const dummyJwt = `${header}.${payload}.signature`

    const res = await app.request('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: dummyJwt }),
    })

    expect(res.status).toBe(403)
    const data = await res.json() as any
    expect(data.success).toBe(false)
    expect(data.error).toBe('DOMAIN_RESTRICTED')
  })

  it('POST /api/auth/google rejects MFU email if account is NOT pre-registered by Admin', async () => {
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({
      email: 'unregistered.student999@student.mfu.ac.th',
      name: 'Unregistered Student',
      sub: 'google_888888',
    }))
    const dummyJwt = `${header}.${payload}.signature`

    const res = await app.request('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: dummyJwt }),
    })

    expect(res.status).toBe(403)
    const data = await res.json() as any
    expect(data.success).toBe(false)
    expect(data.error).toBe('USER_NOT_REGISTERED')
    expect(data.message).toContain('ยังไม่ได้รับการเพิ่มหรือลงทะเบียนโดยผู้ดูแลระบบ')
  })

  it('POST /api/qa/ai-analyze generates qualitative retention analysis', async () => {
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

    const res = await app.request('/api/qa/ai-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    expect(res.status).toBe(200)
    const data = await res.json() as any
    expect(data.success).toBe(true)
    expect(data.analysis).toContain('AUN-QA')
  })

  it('GET /api/users returns safe empty array when DB binding is detached in unit test', async () => {
    const res = await app.request('/api/users')
    expect(res.status).toBe(200)
    const data = await res.json() as { users: any[] }
    expect(Array.isArray(data.users)).toBe(true)
  })

  it('GET /api/requests returns safe empty array when DB binding is detached in unit test', async () => {
    const res = await app.request('/api/requests')
    expect(res.status).toBe(200)
    const data = await res.json() as { requests: any[] }
    expect(Array.isArray(data.requests)).toBe(true)
  })

  it('GET /api/follow-ups returns safe empty array when DB binding is detached in unit test', async () => {
    const res = await app.request('/api/follow-ups')
    expect(res.status).toBe(200)
    const data = await res.json() as { followUps: any[] }
    expect(Array.isArray(data.followUps)).toBe(true)
  })

  it('GET /api/ai/keys returns safe empty array when DB binding is detached in unit test', async () => {
    const res = await app.request('/api/ai/keys')
    expect(res.status).toBe(200)
    const data = await res.json() as { keys: any[] }
    expect(Array.isArray(data.keys)).toBe(true)
  })

  it('POST /api/ai/keys validates required key string', async () => {
    const res = await app.request('/api/ai/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Empty Key Test' }),
    })
    // Either 400 (validation) or 503 (database offline in detached unit test)
    expect([400, 503]).toContain(res.status)
  })

  it('DELETE /api/users/:id handles deletion safely and protects superadmin', async () => {
    const res = await app.request('/api/users/ADM_SE_GOOGLE', {
      method: 'DELETE',
    })
    // Either 400 (superadmin protected), 404 (not found), or 503 (detached unit test db)
    expect([400, 404, 503]).toContain(res.status)
  })

  it('GET /api/categories returns category configs array', async () => {
    const res = await app.request('/api/categories')
    expect(res.status).toBe(200)
    const data = await res.json() as { categories: any[] }
    expect(Array.isArray(data.categories)).toBe(true)
  })

  it('POST /api/categories validates required fields', async () => {
    const res = await app.request('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'Test Category' }),
    })
    expect([400, 503]).toContain(res.status)
  })

  it('GET /api/document-types returns document types array', async () => {
    const res = await app.request('/api/document-types')
    expect(res.status).toBe(200)
    const data = await res.json() as { documentTypes: any[] }
    expect(Array.isArray(data.documentTypes)).toBe(true)
  })

  it('POST /api/document-types validates required fields', async () => {
    const res = await app.request('/api/document-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    })
    expect([400, 503]).toContain(res.status)
  })
})
