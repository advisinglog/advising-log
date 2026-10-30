import { describe, it, expect } from 'vitest'
import { aliasSet, createOwnershipError, ownsRecord, scopeResponse, type Viewer } from './scope'

// Students may be referenced by id, code or email depending on how the record was created
const users = [
  { id: 'STU1', code: '6631503001', email: 'stu1@lamduan.mfu.ac.th', name: 'Student One', role: 'student', phone: '081', department: 'SE', isActive: true, createdAt: '2026-01-01' },
  { id: 'STU2', code: '6631503002', email: 'stu2@lamduan.mfu.ac.th', name: 'Student Two', role: 'student', phone: '082', department: 'SE', isActive: true, createdAt: '2026-01-01' },
  { id: 'STU3', code: '6631503003', email: 'stu3@lamduan.mfu.ac.th', name: 'Student Three', role: 'student', phone: '083', department: 'SE', isActive: true, createdAt: '2026-01-01' },
  { id: 'ADV1', code: 'ADV001', email: 'adv1@mfu.ac.th', name: 'Advisor One', role: 'advisor', phone: '091', department: 'SE', isActive: true, createdAt: '2026-01-01' },
  { id: 'ADV2', code: 'ADV002', email: 'adv2@mfu.ac.th', name: 'Advisor Two', role: 'advisor', phone: '092', department: 'SE', isActive: true, createdAt: '2026-01-01' },
]

const requests = [
  { id: 'R1', studentId: 'STU1', advisorId: 'ADV1', category: 'academic', status: 'requested', details: 'private text 1', createdAt: '2026-02-01' },
  { id: 'R2', studentId: '6631503002', advisorId: 'ADV1', category: 'career', status: 'completed', details: 'private text 2', createdAt: '2026-02-02' },
  { id: 'R3', studentId: 'STU3', advisorId: 'ADV2', category: 'personal', status: 'scheduled', details: 'private text 3', createdAt: '2026-02-03' },
]

const exitCases = [{ id: 'E1', studentId: 'STU3', advisorId: 'ADV2', exitType: 'withdrawal', reasonCode: 'academic', details: 'exit details' }]

const viewer = (role: Viewer['role'], self: string[], linked: string[] = [], exitStudents: string[] = []): Viewer => ({
  role,
  aliases: aliasSet(...self),
  linkedAliases: aliasSet(...linked),
  exitStudentAliases: aliasSet(...exitStudents),
})

const ids = (rows: any[]) => rows.map(r => r.id).sort()

describe('Record-level scoping', () => {
  // ADV1 advises STU1 and STU2 (STU2 linked by code in some records)
  const student1 = viewer('student', ['STU1', '6631503001', 'stu1@lamduan.mfu.ac.th'], ['ADV1', 'ADV001', 'adv1@mfu.ac.th'])
  const advisor1 = viewer('advisor', ['ADV1', 'ADV001', 'adv1@mfu.ac.th'], ['STU1', '6631503001', 'STU2', '6631503002'])
  const qa = viewer('qa_chair', ['QA1'], [], ['STU3', '6631503003'])
  const admin = viewer('admin', ['ADM1'])

  it('students only see their own records', () => {
    expect(ids(scopeResponse('/api/requests', { requests }, student1).requests)).toEqual(['R1'])
    expect(scopeResponse('/api/exit-cases', { exitCases }, student1).exitCases).toEqual([])
  })

  it('students only see themselves and their own advisor in the user list', () => {
    expect(ids(scopeResponse('/api/users', { users }, student1).users)).toEqual(['ADV1', 'STU1'])
  })

  it('advisors only see their advisees (matched by id or code)', () => {
    expect(ids(scopeResponse('/api/requests', { requests }, advisor1).requests)).toEqual(['R1', 'R2'])
    expect(ids(scopeResponse('/api/users', { users }, advisor1).users)).toEqual(['ADV1', 'ADV2', 'STU1', 'STU2'])
  })

  it('QA sees de-identified advising records: no student identity, no free text', () => {
    const rows = scopeResponse('/api/requests', { requests }, qa).requests
    expect(rows).toHaveLength(3)
    for (const r of rows) {
      expect(r).not.toHaveProperty('studentId')
      expect(r).not.toHaveProperty('details')
      expect(r).toHaveProperty('category')
      expect(r).toHaveProperty('advisorId')
    }
  })

  it('QA sees exit cases case-level, and only exit-case students are identifiable', () => {
    expect(scopeResponse('/api/exit-cases', { exitCases }, qa).exitCases).toEqual(exitCases)
    const qaUsers = scopeResponse('/api/users', { users }, qa).users
    const named = qaUsers.filter((u: any) => u.role === 'student' && u.name)
    expect(named.map((u: any) => u.id)).toEqual(['STU3'])
    expect(qaUsers.every((u: any) => !u.phone)).toBe(true)
    expect(qaUsers.filter((u: any) => u.role === 'student')).toHaveLength(3) // counts still work
  })

  it('admins manage users but never receive advising records or personal notes', () => {
    expect(scopeResponse('/api/users', { users }, admin).users).toHaveLength(5)
    expect(scopeResponse('/api/requests', { requests }, admin).requests).toEqual([])
    expect(scopeResponse('/api/sessions', { sessions: [{ id: 'S1', studentId: 'STU1', summary: 'notes' }] }, admin).sessions).toEqual([])
  })

  it('single-user lookups outside the viewer scope are hidden', () => {
    expect(scopeResponse('/api/users/STU2', { user: users[1] }, student1)).toBeNull()
    expect(scopeResponse('/api/users/STU1', { user: users[0] }, student1).user.id).toBe('STU1')
    expect(scopeResponse('/api/users/STU1', { user: users[0] }, qa)).toBeNull()
  })

  it('advisors only see student voice surveys their advisee chose to share', () => {
    const surveys = [
      { id: 'V1', studentId: 'STU1', shareWithAdvisor: true },
      { id: 'V2', studentId: 'STU2', shareWithAdvisor: false },
      { id: 'V3', studentId: 'STU3', shareWithAdvisor: true },
    ]
    expect(ids(scopeResponse('/api/student-voice', { surveys }, advisor1).surveys)).toEqual(['V1'])
  })
})

describe('Write ownership', () => {
  const student1 = viewer('student', ['STU1', '6631503001', 'stu1@lamduan.mfu.ac.th'], ['ADV1', 'ADV001'])
  const advisor1 = viewer('advisor', ['ADV1', 'ADV001', 'adv1@mfu.ac.th'], ['STU1', '6631503001', 'STU2', '6631503002'])

  it('students may only change their own records', () => {
    expect(ownsRecord(student1, { studentId: 'STU1', advisorId: 'ADV1' })).toBe(true)
    expect(ownsRecord(student1, { studentId: '6631503001' })).toBe(true) // referenced by code
    expect(ownsRecord(student1, { studentId: 'STU2', advisorId: 'ADV1' })).toBe(false)
  })

  it("advisors may only change their own or their advisees' records", () => {
    expect(ownsRecord(advisor1, { studentId: 'STU2', advisorId: 'ADV2' })).toBe(true) // their advisee
    expect(ownsRecord(advisor1, { studentId: 'STU3', advisorId: 'ADV1' })).toBe(true) // their record
    expect(ownsRecord(advisor1, { studentId: 'STU3', advisorId: 'ADV2' })).toBe(false)
  })

  it('students may only create records for themselves, sent to their own advisor', () => {
    expect(createOwnershipError(student1, 'requests', { studentId: 'STU1', advisorId: 'ADV1' })).toBeNull()
    expect(createOwnershipError(student1, 'requests', { studentId: 'STU2' })).toBe('student is not you')
    expect(createOwnershipError(student1, 'requests', { studentId: 'STU1', advisorId: 'ADV2' })).toBe('not your advisor')
    expect(createOwnershipError(student1, 'documents', {})).toBe('missing student')
    expect(createOwnershipError(student1, 'student-voice', { isAnonymous: true })).toBeNull()
  })

  it('advisors may only create records for their advisees, as themselves', () => {
    expect(createOwnershipError(advisor1, 'sessions', { studentId: 'STU2', advisorId: 'ADV1' })).toBeNull()
    expect(createOwnershipError(advisor1, 'sessions', { studentId: 'STU3', advisorId: 'ADV1' })).toBe('not your advisee')
    expect(createOwnershipError(advisor1, 'appointments', { studentId: 'STU1', advisorId: 'ADV2' })).toBe('advisor is not you')
  })

  it('advisors may add new students to the roster, but only under themselves', () => {
    expect(createOwnershipError(advisor1, 'roster', { studentId: 'NEW_STUDENT', advisorId: 'ADV1' })).toBeNull()
    expect(createOwnershipError(advisor1, 'roster', { studentId: 'NEW_STUDENT', advisorId: 'ADV2' })).toBe('advisor is not you')
    expect(createOwnershipError(advisor1, 'roster', { studentId: 'NEW_STUDENT' })).toBe('advisor is not you')
  })
})
