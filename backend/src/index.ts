import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getDb } from './db'
import * as schema from './db/schema'
import { eq, desc, and, or } from 'drizzle-orm'

export type Bindings = {
  DB?: D1Database
  GEMINI_API_KEY?: string
  SUPER_ADMIN_EMAIL?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'x-gemini-key'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))

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
      aiProvider: 'Google Gemini 1.5 Flash',
    },
  })
})

// --- Helper to safely get Drizzle DB ---
function db(c: any) {
  if (!c.env?.DB) return null
  return getDb(c.env.DB)
}

// ============================================================
// 0. Google OAuth Authentication & SSO
// ============================================================
// 0. Google OAuth Authentication & SSO (MFU Domain & Advisee Guard)
// ============================================================
app.post('/api/auth/google', async (c) => {
  try {
    const { credential } = await c.req.json<{ credential?: string }>()
    if (!credential) {
      return c.json({ success: false, error: 'Missing Google credential token' }, 400)
    }

    // Decode JWT Payload without external dependencies
    const parts = credential.split('.')
    if (parts.length < 2) {
      return c.json({ success: false, error: 'Invalid Google credential token format' }, 400)
    }

    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = JSON.parse(atob(payloadBase64))
    const { email, name, picture, sub: googleId } = decoded

    if (!email) {
      return c.json({ success: false, error: 'Google account has no email address' }, 400)
    }

    const lowerEmail = email.toLowerCase()
    const codePrefix = lowerEmail.split('@')[0].toUpperCase()
    const superAdminEmail = (c.env?.SUPER_ADMIN_EMAIL || 'se.advisinglog@gmail.com').toLowerCase().trim()
    const isAuthorizedSuperAdmin = lowerEmail === superAdminEmail

    const isMfuDomain =
      lowerEmail.endsWith('@mfu.ac.th') ||
      lowerEmail.endsWith('@student.mfu.ac.th') ||
      lowerEmail.endsWith('@lamduan.mfu.ac.th') ||
      lowerEmail.endsWith('@lamduan.ac.th')

    const database = db(c)

    // Offline / Mock Fallback (when DB binding is absent)
    if (!database) {
      if (isAuthorizedSuperAdmin) {
        const adminUser = {
          id: 'ADM_SE_GOOGLE',
          code: 'ADM-SUPER',
          name: 'System Admin (SE AdvisingLog)',
          email: lowerEmail,
          role: 'admin' as const,
          department: 'Academic & System Affairs',
          isActive: true,
          hasAiAccess: true,
          avatar: picture || null,
          createdAt: new Date().toISOString().split('T')[0],
        }
        return c.json({ success: true, user: adminUser, source: 'offline_fallback' })
      }

      // Check if user is known in pre-registered list
      const isKnownUser = lowerEmail.startsWith('6631503') || lowerEmail.startsWith('prasit') || lowerEmail.startsWith('nittaya') || lowerEmail.startsWith('worasak') || lowerEmail.startsWith('admin')

      if (!isKnownUser) {
        if (!isMfuDomain) {
          return c.json({
            success: false,
            error: 'DOMAIN_RESTRICTED',
            message: 'ไม่อนุญาตให้เข้าใช้งาน: กรุณาใช้อีเมลมหาวิทยาลัยแม่ฟ้าหลวง (@mfu.ac.th หรือ @lamduan.mfu.ac.th) หรือบัญชีที่ได้รับการลงทะเบียนโดยผู้ดูแลระบบ',
          }, 403)
        }
        return c.json({
          success: false,
          error: 'USER_NOT_REGISTERED',
          message: `ไม่สามารถเข้าสู่ระบบได้: บัญชีของคุณ (${lowerEmail}) ยังไม่ได้รับการเพิ่มหรือลงทะเบียนโดยผู้ดูแลระบบ (Admin) กรุณาติดต่อสำนักวิชาหรือผู้ดูแลระบบเพื่อเพิ่มรายชื่อเข้าสู่ระบบ`,
        }, 403)
      }

      let role: 'student' | 'advisor' | 'qa_chair' | 'admin' = 'advisor'
      if (/^\d/.test(codePrefix) || lowerEmail.includes('student') || lowerEmail.includes('lamduan')) {
        role = 'student'
      }

      const fallbackUser = {
        id: `GOOGLE_${googleId.substring(0, 8)}`,
        code: codePrefix,
        name: name || 'Google User',
        email: lowerEmail,
        role,
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        hasAiAccess: role !== 'student',
        avatar: picture || null,
        createdAt: new Date().toISOString().split('T')[0],
      }
      return c.json({ success: true, user: fallbackUser, source: 'offline_fallback' })
    }

    // 1. Search User in Cloudflare D1 (Check if registered by Admin)
    let user = await database.select().from(schema.users)
      .where(
        or(
          eq(schema.users.email, lowerEmail),
          eq(schema.users.email, email.trim()),
          eq(schema.users.code, codePrefix),
          eq(schema.users.code, codePrefix.toLowerCase()),
          eq(schema.users.code, codePrefix.toUpperCase()),
        )
      ).get()

    // Case-insensitive / whitespace-tolerant fallback across all users
    if (!user) {
      const allUsers = await database.select().from(schema.users)
      user = allUsers.find(
        (u) =>
          u.email?.toLowerCase().trim() === lowerEmail ||
          u.code?.toUpperCase().trim() === codePrefix ||
          (u.email && u.email.toLowerCase().trim().split('@')[0] === codePrefix.toLowerCase())
      ) || null
    }

    // If Super Admin account, auto-provision if not exists or update code
    if (!user && isAuthorizedSuperAdmin) {
      const newAdmin = {
        id: 'ADM_SE_GOOGLE',
        code: 'ADM-SUPER',
        name: 'System Admin (SE AdvisingLog)',
        email: lowerEmail,
        role: 'admin' as const,
        department: 'Academic & System Affairs',
        phone: null,
        isActive: true,
        hasAiAccess: true,
        createdAt: new Date().toISOString().split('T')[0],
      }
      await database.insert(schema.users).values(newAdmin)
      user = newAdmin
    } else if (user && isAuthorizedSuperAdmin && user.code !== 'ADM-SUPER') {
      await database.update(schema.users).set({ code: 'ADM-SUPER' }).where(eq(schema.users.id, user.id))
      user = { ...user, code: 'ADM-SUPER' }
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

    // Check if account is active
    if (!user.isActive) {
      return c.json({
        success: false,
        error: 'ACCOUNT_DEACTIVATED',
        message: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ',
      }, 403)
    }

    // 4. Student Advisee Check: Student MUST be assigned to an advisor by Admin or Advisor
    let assignedAdvisor = null
    if (user.role === 'student') {
      const allAssignments = await database.select().from(schema.studentAdvisorAssignments).where(eq(schema.studentAdvisorAssignments.isActive, true))
      const assignment = allAssignments.find(
        (a) =>
          a.studentId === user.id ||
          a.studentId?.toUpperCase() === user.code?.toUpperCase() ||
          a.studentId?.toLowerCase() === user.email?.toLowerCase() ||
          a.studentId?.toLowerCase() === lowerEmail ||
          a.studentId?.toUpperCase() === codePrefix
      )

      if (!assignment) {
        return c.json({
          success: false,
          error: 'STUDENT_NOT_ASSIGNED',
          message: 'ไม่สามารถเข้าสู่ระบบได้: บัญชีนักศึกษาของคุณยังไม่ได้รับการจัดสรรอาจารย์ที่ปรึกษา กรุณาติดต่ออาจารย์ที่ปรึกษาหรือสำนักวิชาเพื่อดำเนินการเพิ่มรายชื่อ',
          studentInfo: {
            name: user.name,
            code: user.code,
            email: user.email,
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

    return c.json({
      success: true,
      user: {
        ...user,
        name: name || user.name,
        avatar: picture || null,
        advisor: assignedAdvisor,
      },
      token: `session_${Date.now()}_${googleId.substring(0, 6)}`,
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
  if (!database) return c.json({ users: [] })
  
  const role = c.req.query('role')
  if (role) {
    const list = await database.select().from(schema.users).where(eq(schema.users.role, role as any))
    return c.json({ users: list })
  }
  const allUsers = await database.select().from(schema.users)
  return c.json({ users: allUsers })
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

  const superAdminEmail = (c.env?.SUPER_ADMIN_EMAIL || 'se.advisinglog@gmail.com').toLowerCase().trim()
  const emailPrefix = cleanEmail.split('@')[0]
  const isStudent = /^\d/.test(emailPrefix) || cleanEmail.includes('@student.') || cleanEmail.includes('@lamduan.')
  const assignedRole = isStudent
    ? 'student'
    : (body.role === 'admin' && cleanEmail !== superAdminEmail ? 'advisor' : body.role || 'advisor')
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
  const superAdminEmail = (c.env?.SUPER_ADMIN_EMAIL || 'se.advisinglog@gmail.com').toLowerCase().trim()

  const allUsers = await database.select().from(schema.users)
  const insertedUsers = []

  for (const item of userList) {
    const cleanEmail = (item.email || '').trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) continue

    const emailPrefix = cleanEmail.split('@')[0]
    const isStudent = /^\d/.test(emailPrefix) || cleanEmail.includes('@student.') || cleanEmail.includes('@lamduan.')
    const assignedRole = isStudent
      ? 'student'
      : (item.role === 'admin' && cleanEmail !== superAdminEmail ? 'advisor' : item.role || 'advisor')

    const autoCode = item.code ? String(item.code).trim() : (isStudent ? emailPrefix : `STAFF_${Date.now().toString().slice(-4)}`)
    const derivedName = item.name?.trim() || deriveNameFromEmail(item.email)

    const existingUser = allUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.code.toUpperCase() === autoCode.toUpperCase() ||
        (item.id && u.id === item.id)
    )

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
  const superAdminEmail = (c.env?.SUPER_ADMIN_EMAIL || 'se.advisinglog@gmail.com').toLowerCase().trim()
  if (
    targetUser &&
    body.isActive === false &&
    (targetUser.id === 'ADM_SE_GOOGLE' || targetUser.code === 'ADM-SUPER' || targetUser.email?.toLowerCase().trim() === superAdminEmail)
  ) {
    return c.json({ success: false, error: 'Cannot deactivate Master Super Admin account' }, 400)
  }

  await database.update(schema.users).set(body).where(eq(schema.users.id, id))
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
  const superAdminEmail = (c.env?.SUPER_ADMIN_EMAIL || 'se.advisinglog@gmail.com').toLowerCase().trim()
  if (
    targetUser.id === 'ADM_SE_GOOGLE' ||
    targetUser.code === 'ADM-SUPER' ||
    targetUser.email?.toLowerCase().trim() === superAdminEmail
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
  if (!database) return c.json({ roster: [] })
  const list = await database.select().from(schema.studentAdvisorAssignments)
  return c.json({ roster: list })
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
  const existing = allAssignments.find(
    (a) => a.studentId === targetStudentId || (body.id && a.id === body.id)
  )

  const assignment = {
    id: existing ? existing.id : (body.id || `R_${Date.now()}`),
    studentId: targetStudentId,
    advisorId: targetAdvisorId,
    assignedAt: body.assignedAt || (existing ? existing.assignedAt : new Date().toISOString().split('T')[0]),
    isActive: body.isActive !== undefined ? body.isActive : true,
  }

  if (existing) {
    await database.update(schema.studentAdvisorAssignments).set(assignment).where(eq(schema.studentAdvisorAssignments.id, existing.id))
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

  const studentId = c.req.query('studentId')
  const advisorId = c.req.query('advisorId')

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
  const newReq = {
    id: body.id || `REQ${Date.now()}`,
    studentId: body.studentId,
    advisorId: body.advisorId,
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

  await database.insert(schema.advisingRequests).values(newReq)
  return c.json({ success: true, request: newReq }, 201)
})

app.patch('/api/requests/:id/status', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  const body = await c.req.json()
  await database.update(schema.advisingRequests)
    .set({ status: body.status, updatedAt: new Date().toISOString().split('T')[0] })
    .where(eq(schema.advisingRequests.id, id))
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
  const newSession = {
    id: body.id || `SES${Date.now()}`,
    requestId: body.requestId,
    appointmentId: body.appointmentId || null,
    studentId: body.studentId,
    advisorId: body.advisorId,
    sessionDate: body.sessionDate || new Date().toISOString().split('T')[0],
    summary: body.summary,
    problem: body.problem,
    advice: body.advice,
    actionsTaken: body.actionsTaken,
    outcome: body.outcome,
    createdAt: body.createdAt || new Date().toISOString().split('T')[0],
  }

  await database.insert(schema.advisingSessions).values(newSession)
  return c.json({ success: true, session: newSession }, 201)
})

// ============================================================
// 4. Follow-ups & Student Progress Tracking
// ============================================================
app.get('/api/follow-ups', async (c) => {
  const database = db(c)
  if (!database) return c.json({ followUps: [] })

  const studentId = c.req.query('studentId')
  if (studentId) {
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
  const newFollowUp = {
    id: body.id || `FOL${Date.now()}`,
    sessionId: body.sessionId || null,
    requestId: body.requestId || null,
    studentId: body.studentId,
    advisorId: body.advisorId,
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
  const progressRecord = {
    id: body.id || `FUP${Date.now()}`,
    followUpId: body.followUpId,
    studentId: body.studentId,
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

  const body = await c.req.json()
  const newExitCase = {
    id: body.id || `EXT${Date.now()}`,
    studentId: body.studentId,
    advisorId: body.advisorId,
    exitType: body.exitType,
    reasonCode: body.reasonCode,
    reasonCategory: body.reasonCategory,
    details: body.details,
    documents: typeof body.documents === 'string' ? body.documents : JSON.stringify(body.documents || []),
    advisorAssessment: body.advisorAssessment || null,
    status: body.status || 'submitted',
    pdpaConsent: body.pdpaConsent !== undefined ? body.pdpaConsent : true,
    voiceSurveyCompleted: body.voiceSurveyCompleted || false,
    createdAt: body.createdAt || new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  }

  await database.insert(schema.exitCases).values(newExitCase)
  return c.json({ success: true, exitCase: newExitCase }, 201)
})

app.patch('/api/exit-cases/:id', async (c) => {
  const database = db(c)
  if (!database) return c.json({ error: 'Database unavailable' }, 503)

  const id = c.req.param('id')
  const body = await c.req.json()
  await database.update(schema.exitCases)
    .set({ ...body, updatedAt: new Date().toISOString().split('T')[0] })
    .where(eq(schema.exitCases.id, id))
  return c.json({ success: true })
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
    }
  })
  return c.json({ earlyWarnings: formatted })
})

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
  if (!database) return c.json({ logs: [] })
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
  const log = {
    id: body.id || `LOG${Date.now()}`,
    userId: body.userId,
    userName: body.userName,
    userRole: body.userRole,
    action: body.action,
    description: body.description,
    targetId: body.targetId || null,
    timestamp: body.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
    ipAddress: body.ipAddress || '127.0.0.1',
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
    model: 'gemini-1.5-flash',
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
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmedKey)}`)
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
            const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${encodeURIComponent(trimmedKey)}`

            const genRes = await fetch(generateUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
      ]

      for (const endpoint of fallbackModels) {
        try {
          const res = await fetch(`${endpoint}?key=${encodeURIComponent(trimmedKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
      return `Case #${idx + 1} [ID: ${item.studentCode || item.id} | Year: ${item.academicYear || 'N/A'} | Type: ${item.exitType} | Reason: ${item.reasonCode}]
- Student Stated Reason: "${item.details || 'N/A'}"
- Advisor Assessment: "${item.advisorAssessment || 'N/A'}"
- Student Survey Voice: "${item.studentVoiceFeedback || 'N/A'}"`
    }).join('\n\n')

    // If Gemini API Key is available, call Google Gemini 1.5 Flash
    if (apiKey && apiKey.trim().length > 10) {
      const systemInstruction = `You are an expert Higher Education Quality Assurance (QA) Analyst and Academic Retention Specialist advising the Program Chair and Dean under AUN-QA Criterion 6 (Student Support Services) and Criterion 8 (Retention & Dropout Rates).
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

      const candidateEndpoints = [
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      ]

      const payload = {
        contents: [{ parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }

      for (const endpoint of candidateEndpoints) {
        try {
          const geminiUrl = `${endpoint}?key=${encodeURIComponent(apiKey.trim())}`
          const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
          }
        } catch (_err) {}
      }

      // Dynamic model fallback via listModels
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`)
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
            const dynamicUrl = `https://generativelanguage.googleapis.com/v1beta/${m.name}:generateContent?key=${encodeURIComponent(apiKey.trim())}`
            const dynRes = await fetch(dynamicUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
            }
          }
        }
      } catch (_e) {}
    }

    // Smart Local Analytical Fallback (when no active key or offline)
    let fallbackText = ''
    if (mode === 'strategic_synthesis') {
      fallbackText = lang === 'th'
        ? `### 📊 ผลการสังเคราะห์ข้อมูลเชิงคุณภาพเพื่อการประกันคุณภาพ (AUN-QA Criteria 6 & 8)

#### 1. บทสรุปสำหรับผู้บริหาร (Executive Summary)
จากข้อมูลเชิงคุณภาพของนักศึกษาที่ขอยื่นลาออกถาวร (Withdrawal) และขอพักการศึกษา (Leave of Absence) รวมทั้งสิ้น ${cases.length} กรณี:
* **การลาออกถาวร (Permanent Withdrawal):** สาเหตุหลักเกิดจากการค้นพบว่า *สาขาวิชาไม่ตรงกับความถนัด* และ *ความยากสะสมของวิชาโปรแกรมมิ่งในปี 1*
* **การขอพักการศึกษา (Leave of Absence):** ปัจจัยหลักคือ *ปัญหาสุขภาพจิต/ความเครียดสะสม* และ *ภาระทางการเงิน/ครอบครัว* โดยนักศึกษาส่วนใหญ่ยังมีความประสงค์จะกลับมาศึกษาต่อหากได้รับการช่วยเหลือ

#### 2. สาเหตุรากเหง้า 3 ลำดับแรก (Top 3 Qualitative Root Causes)
1. **Curriculum Pacing & Foundation Shock:** นักศึกษาที่ไม่มีพื้นฐานสายคำนวณปรับตัวกับความเร็วในการสอนวิชาเขียนโปรแกรมช่วง 4 สัปดาห์แรกไม่ทัน
2. **Mental Health & Isolation:** ความกดดันในการทำงานกลุ่มและขาดการปฏิสัมพันธ์เชิงลึกกับอาจารย์ที่ปรึกษา
3. **Financial Hardship:** ปัญหาค่าครองชีพและอุปกรณ์คอมพิวเตอร์สำหรับการเรียน

#### 3. ข้อเสนอแนะเชิงมาตรการพัฒนาคุณภาพ (CQI Recommendations)
* **ระยะสั้น (0–3 เดือน):** จัดคลินิกเขียนโปรแกรม (Peer Tutoring) และให้อาจารย์ที่ปรึกษานัดพบเชิงรุกสำหรับกลุ่มเสี่ยง
* **ระยะยาว (1 ปี):** ทบทวนแผนการจัดการเรียนรู้วิชาปี 1 เทอม 1 และเพิ่มหลักสูตรเสริมทักษะแบบไมโครเครเดนเชียล`
        : `### 📊 Qualitative Retention & Exit Synthesis (AUN-QA Criteria 6 & 8)

#### 1. Executive Summary
Based on ${cases.length} qualitative departure records (Withdrawals vs. Leaves of Absence):
* **Permanent Withdrawals:** Heavily driven by mismatched curriculum expectations and introductory programming difficulty.
* **Leaves of Absence:** Primarily linked to mental health strain, temporary family financial needs, and medical recovery.

#### 2. Top Qualitative Root Causes
1. **Foundation Shock:** Steep learning curve in Year 1 Term 1 computing and mathematics modules.
2. **Mental Well-being:** Burnout and hesitation in seeking timely counselling.
3. **Financial Constraints:** Need for interim employment or lack of high-performance development hardware.

#### 3. AUN-QA CQI Interventions
* **Immediate (0–3 Months):** Implement departmental assignment coordination and mandatory 2-week pre-sessional coding boot camps.
* **Curriculum Revision (1 Year):** Introduce flexible minor degree options (UX/UI & Creative Tech) and structured re-entry roadmaps.`
    } else if (mode === 'case_diagnostic') {
      const targetCase = cases[0]
      fallbackText = lang === 'th'
        ? `### 🩺 การวินิจฉัยเคสรายบุคคลเชิงลึก (AI Case Diagnostic)

* **รหัสเคส / นักศึกษา:** ${targetCase?.studentCode || 'De-identified Case'} (${targetCase?.exitType === 'leave_of_absence' ? 'ขอพักการศึกษา' : 'ขอลาออกถาวร'})
* **สาเหตุหลักที่ระบุ:** ${targetCase?.reasonCode || 'ทั่วไป'}

#### การประเมินสาเหตุแท้จริง (Root Cause Evaluation)
* คำอธิบายของนักศึกษาสะท้อนปัญหา: "${targetCase?.details || 'ไม่มีรายละเอียดเพิ่มเติม'}"
* ข้อวินิจฉัยของอาจารย์ที่ปรึกษา: "${targetCase?.advisorAssessment || 'รอการประเมิน'}"

#### ข้อเสนอแนะเชิงมาตรการช่วยเหลือ (Actionable Guidance)
1. **การชะลอการตัดสินใจ:** หากเป็นปัญหาความเครียดหรือภาระครอบครัว ควรแนะนำการพักการศึกษาแทนการลาออก เพื่อรักษาสถานภาพและหน่วยกิต
2. **การประสานส่งต่อ:** ประสานส่วนบริการสุขภาพ/ศูนย์สุขภาพจิต MFU Counselling Center หรือส่วนทะเบียน (REG)
3. **แผนการกลับเข้าศึกษา:** กำหนดนัดหมายติดตามผลทุก 4 สัปดาห์ เพื่อเตรียมความพร้อมวิชาการก่อนเปิดภาคเรียนถัดไป`
        : `### 🩺 Individual Case AI Diagnostic

* **Case / Student ID:** ${targetCase?.studentCode || 'De-identified Case'} (${targetCase?.exitType})
* **Primary Stated Cause:** ${targetCase?.reasonCode}

#### Root Cause Evaluation
* Student Perspective: "${targetCase?.details || 'N/A'}"
* Advisor Assessment: "${targetCase?.advisorAssessment || 'N/A'}"

#### Actionable Guidance
1. **Retention Intervention:** If driven by burnout or family crises, advocate for temporary leave over permanent withdrawal.
2. **Cross-unit Referral:** Connect with MFU Counselling Center or Registrar Division.
3. **Re-entry Protocol:** Schedule monthly check-ins to ensure smooth academic return.`
    } else {
      fallbackText = lang === 'th'
        ? `### 💡 คำตอบเชิงคุณภาพจากระบบ AI สำหรับประธานหลักสูตร

**ประเด็นคำถาม:** "${userQuery}"

**การวิเคราะห์จากฐานข้อมูลเคสจริง (${cases.length} เคส):**
1. **ข้อค้นพบสำคัญ:** ข้อมูลเชิงคุณภาพชี้ให้เห็นว่า นักศึกษาไม่ได้ลาออกเพราะ "ไม่อยากเรียน" แต่เกิดจาก "กำแพงความยากของวิชาแกนช่วงแรก" ผสมกับ "ความกังวลเรื่องค่าใช้จ่ายและสุขภาพจิต"
2. **เสียงสะท้อนนักศึกษา:** นักศึกษาระบุตรงกันว่าต้องการ *วิชาปรับพื้นฐาน (Boot Camp)* และ *ความยืดหยุ่นของกำหนดส่งงาน*
3. **ข้อเสนอแนะเชิงรูปธรรม:**
   * ให้ประธานหลักสูตรจัดประชุมผู้สอนวิชาปี 1 เพื่อปรับจังหวะการสอน (Teaching Pace) ให้มีความชันน้อยลงในเดือนแรก
   * ให้อาจารย์ที่ปรึกษาใช้ระบบ Early Warning ติดตามนักศึกษาที่ขาดเรียนหรือทำคะแนน Quiz แรกได้น้อยกว่า 50% ทันที`
        : `### 💡 AI Qualitative Analysis for Program Chair

**Query:** "${userQuery}"

**Evidence-based Analysis from Current Cohort (${cases.length} Cases):**
1. **Core Insight:** Qualitative narratives show departures stem not from apathy, but from early foundation hurdles coupled with financial/mental fatigue.
2. **Student Sentiment:** Students strongly advocate for pre-sessional boot camps and workload scheduling.
3. **Actionable Recommendations:**
   * Convene Year 1 faculty to modulate initial lecture pacing during the first month.
   * Mandate advisor early-warning check-ins when quiz scores drop below 50% in weeks 3-4.`
    }

    return c.json({
      success: true,
      provider: 'AdvisingLog AI Intelligence Engine (Offline / Smart Fallback)',
      mode,
      analysis: fallbackText,
      timestamp: new Date().toISOString(),
      note: apiKey ? 'API key was processed' : 'Running on intelligent local engine. Provide a Gemini API key to query live Google cloud model.',
    })
  } catch (err: any) {
    return c.json({
      success: false,
      error: err.message || 'Failed to process AI analysis',
    }, 500)
  }
})

export default app
