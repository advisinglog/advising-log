// ============================================================
// AdvisingLog — Mock Store (React Context)
// Simple reactive store for prototype state management
// ============================================================

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import api from '@/services/apiClient'
import type {
  AdvisingRequest,
  RequestProgress,
  Appointment,
  AdvisingSession,
  FollowUp,
  FollowUpProgress,
  Referral,
  Notification,
  EarlyWarningCase,
  EarlyWarningFollowUp,
  ExitCase,
  AdvisorExitAssessment,
  StudentVoiceResponse,
  StudentDocument,
  User,
  UserRole,
  StudentAdvisorAssignment,
  AdvisingCategoryConfig,
  DocumentType,
  AuditLog,
  SystemApiConfig,
  RosterImportEntry,
  RosterImportResult,
  AiApiKey,
} from '@/types'
import {
  mockRequests,
  mockRequestProgress,
  mockAppointments,
  mockSessions,
  mockFollowUps,
  mockFollowUpProgress,
  mockReferrals,
  mockNotifications,
  mockEarlyWarnings,
  mockEarlyWarningFollowUps,
  mockExitCases,
  mockAdvisorAssessments,
  mockStudentVoiceResponses,
  mockStudentDocuments,
  mockUsers,
  mockRoster,
  mockCategoryConfigs,
  mockDocumentTypes,
  mockAuditLogs,
} from '@/data/mock-data'

const isTestEnv = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || import.meta.env?.MODE === 'test'

// --- Helper: generate simple IDs ---
let counter = 1000
function nextId(prefix: string): string {
  counter++
  return `${prefix}${counter}`
}

function now(): string {
  return new Date().toISOString().split('T')[0]
}

// --- Store Shape ---

interface StoreState {
  users: User[]
  roster: StudentAdvisorAssignment[]
  requests: AdvisingRequest[]
  appointments: Appointment[]
  sessions: AdvisingSession[]
  followUps: FollowUp[]
  referrals: Referral[]
  notifications: Notification[]
  earlyWarnings: EarlyWarningCase[]
  earlyWarningFollowUps: EarlyWarningFollowUp[]
  followUpProgress: FollowUpProgress[]
  requestProgress: RequestProgress[]
  exitCases: ExitCase[]
  advisorAssessments: AdvisorExitAssessment[]
  studentVoiceResponses: StudentVoiceResponse[]
  completedVoiceStudents: string[]
  documents: StudentDocument[]
  categoryConfigs: AdvisingCategoryConfig[]
  documentTypes: DocumentType[]
  auditLogs: AuditLog[]
  systemApiConfig: SystemApiConfig
  aiKeys: AiApiKey[]
}

interface StoreActions {
  // Requests
  addRequest: (req: Omit<AdvisingRequest, 'id' | 'createdAt' | 'updatedAt'>) => AdvisingRequest
  updateRequestStatus: (id: string, status: AdvisingRequest['status']) => void

  // Appointments
  addAppointment: (apt: Omit<Appointment, 'id' | 'createdAt'>) => Appointment
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void
  confirmAppointment: (appointmentId: string) => void
  declineAppointment: (appointmentId: string, reason?: string) => void

  // Sessions
  addSession: (ses: Omit<AdvisingSession, 'id' | 'createdAt'>) => AdvisingSession

  // Follow-ups
  addFollowUp: (fu: Omit<FollowUp, 'id' | 'createdAt'>) => FollowUp
  updateFollowUpStatus: (id: string, status: FollowUp['status']) => void
  addFollowUpProgress: (fp: Omit<FollowUpProgress, 'id' | 'createdAt'>) => FollowUpProgress
  updateFollowUpProgress: (id: string, progress: number, notes: string) => void

  // Request Progress
  addRequestProgress: (rp: Omit<RequestProgress, 'id' | 'createdAt'>) => RequestProgress
  updateRequestProgress: (id: string, progress: number, notes: string) => void

  // Referrals
  addReferral: (ref: Omit<Referral, 'id' | 'createdAt'>) => Referral
  updateReferralStatus: (id: string, status: Referral['status']) => void

  // Notifications
  addNotification: (n: Omit<Notification, 'id' | 'createdAt'>) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (userId: string) => void

  // Early Warnings
  addEarlyWarning: (ew: Omit<EarlyWarningCase, 'id' | 'createdAt'>) => EarlyWarningCase
  updateEarlyWarningStatus: (id: string, status: EarlyWarningCase['status']) => void
  addEarlyWarningFollowUp: (fw: Omit<EarlyWarningFollowUp, 'id' | 'createdAt'>) => EarlyWarningFollowUp
  updateEarlyWarningFollowUpStatus: (id: string, status: EarlyWarningFollowUp['status']) => void

  // Exit Cases
  addExitCase: (ec: Omit<ExitCase, 'id' | 'createdAt' | 'updatedAt'>) => ExitCase
  updateExitCaseStatus: (id: string, status: ExitCase['status']) => void

  // Advisor Assessments
  addAdvisorAssessment: (a: Omit<AdvisorExitAssessment, 'id' | 'createdAt'>) => AdvisorExitAssessment
  updateAdvisorAssessmentResolution: (exitCaseId: string, resolution: string) => void

  // Student Voice Responses
  addStudentVoiceResponse: (svr: Omit<StudentVoiceResponse, 'id' | 'createdAt'>) => StudentVoiceResponse
  markVoiceSurveyCompleted: (studentId: string) => void

  // Documents
  addDocument: (doc: Omit<StudentDocument, 'id'>) => StudentDocument
  updateDocument: (id: string, updates: Partial<StudentDocument>) => void
  updateDocumentStatus: (id: string, status: StudentDocument['status']) => void
  deleteDocument: (id: string) => void

  // Users
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => User
  bulkAddUsers: (users: Partial<User>[]) => Promise<User[]>
  updateUser: (id: string, updates: Partial<User>) => void
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>

  // Roster
  addRosterEntry: (entry: Omit<StudentAdvisorAssignment, 'id' | 'assignedAt'>) => void
  updateRosterEntry: (studentId: string, newAdvisorId: string) => void
  batchImportRoster: (entries: RosterImportEntry[], mode: 'upsert' | 'replace') => RosterImportResult

  // System & API Configuration
  toggleAiApi: (enabled: boolean, adminName?: string) => void
  toggleUserAiAccess: (userId: string, enabled: boolean, adminName?: string) => void
  addAiKey: (name: string, key: string, isDefault?: boolean) => Promise<void>
  setDefaultAiKey: (id: string) => Promise<void>
  deleteAiKey: (id: string) => Promise<void>
  refreshAiKeys: () => Promise<void>

  // Categories
  addCategory: (cat: Omit<AdvisingCategoryConfig, 'id'>) => void
  updateCategory: (id: string, updates: Partial<AdvisingCategoryConfig>) => void

  // Document Types
  addDocumentType: (dt: Omit<DocumentType, 'id'>) => void
  updateDocumentType: (id: string, updates: Partial<DocumentType>) => void

  // Audit
  addAuditLog: (log: Omit<AuditLog, 'id' | 'createdAt'>) => void
}


type Store = StoreState & StoreActions

const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(isTestEnv ? [...mockUsers] : [])
  const [roster, setRoster] = useState<StudentAdvisorAssignment[]>(isTestEnv ? [...mockRoster] : [])
  const [requests, setRequests] = useState<AdvisingRequest[]>(isTestEnv ? [...mockRequests] : [])
  const [appointments, setAppointments] = useState<Appointment[]>(isTestEnv ? [...mockAppointments] : [])
  const [sessions, setSessions] = useState<AdvisingSession[]>(isTestEnv ? [...mockSessions] : [])
  const [followUps, setFollowUps] = useState<FollowUp[]>(isTestEnv ? [...mockFollowUps] : [])
  const [referrals, setReferrals] = useState<Referral[]>(isTestEnv ? [...mockReferrals] : [])
  const [notifications, setNotifications] = useState<Notification[]>(isTestEnv ? [...mockNotifications] : [])
  const [earlyWarnings, setEarlyWarnings] = useState<EarlyWarningCase[]>(isTestEnv ? [...mockEarlyWarnings] : [])
  const [earlyWarningFollowUps, setEarlyWarningFollowUps] = useState<EarlyWarningFollowUp[]>(isTestEnv ? [...mockEarlyWarningFollowUps] : [])
  const [followUpProgress, setFollowUpProgress] = useState<FollowUpProgress[]>(isTestEnv ? [...mockFollowUpProgress] : [])
  const [requestProgress, setRequestProgress] = useState<RequestProgress[]>(isTestEnv ? [...mockRequestProgress] : [])
  const [exitCases, setExitCases] = useState<ExitCase[]>(isTestEnv ? [...mockExitCases] : [])
  const [advisorAssessments, setAdvisorAssessments] = useState<AdvisorExitAssessment[]>(isTestEnv ? [...mockAdvisorAssessments] : [])
  const [studentVoiceResponses, setStudentVoiceResponses] = useState<StudentVoiceResponse[]>(isTestEnv ? [...mockStudentVoiceResponses] : [])
  const [completedVoiceStudents, setCompletedVoiceStudents] = useState<string[]>([])
  const [documents, setDocuments] = useState<StudentDocument[]>(isTestEnv ? [...mockStudentDocuments] : [])
  const [categoryConfigs, setCategoryConfigs] = useState<AdvisingCategoryConfig[]>([...mockCategoryConfigs])
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([...mockDocumentTypes])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(isTestEnv ? [...mockAuditLogs] : [])
  const [aiKeys, setAiKeys] = useState<AiApiKey[]>([])
  const [systemApiConfig, setSystemApiConfig] = useState<SystemApiConfig>({
    isAiApiEnabled: true,
    provider: 'Google Gemini 1.5 Flash',
    model: 'gemini-1.5-flash',
    lastToggledAt: new Date().toISOString(),
    lastToggledBy: 'Admin (System)',
    notes: 'Active for Higher Ed QA retention analysis',
  })

  // --- Background Backend Sync on Mount (Real Data from Cloudflare D1) ---
  const refreshAiKeys = useCallback(async () => {
    const kRes = await api.getAiKeys()
    if (kRes && Array.isArray(kRes.keys)) {
      setAiKeys(kRes.keys)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    if (isTestEnv) return // In test mode, keep test fixtures intact
    async function syncFromBackend() {
      const [uRes, rosRes, rRes, aptRes, fRes, sRes, eRes, vRes, aRes, kRes, ewRes, docRes] = await Promise.all([
        api.getUsers(),
        api.getRoster(),
        api.getRequests(),
        api.getAppointments(),
        api.getFollowUps(),
        api.getSessions(),
        api.getExitCases(),
        api.getStudentVoice(),
        api.getAuditLogs(),
        api.getAiKeys(),
        api.getEarlyWarnings(),
        api.getDocuments(),
      ])
      if (!isMounted) return
      if (uRes && Array.isArray(uRes.users)) setUsers(uRes.users)
      if (rosRes && Array.isArray(rosRes.roster)) setRoster(rosRes.roster)
      if (rRes && Array.isArray(rRes.requests)) setRequests(rRes.requests)
      if (aptRes && Array.isArray(aptRes.appointments)) setAppointments(aptRes.appointments)
      if (fRes && Array.isArray(fRes.followUps)) setFollowUps(fRes.followUps)
      if (sRes && Array.isArray(sRes.sessions)) setSessions(sRes.sessions)
      if (eRes && Array.isArray(eRes.exitCases)) setExitCases(eRes.exitCases)
      if (vRes && Array.isArray(vRes.surveys)) {
        const normalized = vRes.surveys.map((s: any) => ({
          ...s,
          primaryFactors: Array.isArray(s.primaryFactors)
            ? s.primaryFactors
            : typeof s.primaryFactors === 'string'
              ? (() => { try { return JSON.parse(s.primaryFactors) } catch { return [] } })()
              : [],
          ratings: s.ratings || {
            curriculumRelevance: s.curriculumRating ?? 3,
            teachingQuality: s.teachingRating ?? 3,
            advisorSupport: s.advisorRating ?? 3,
            universityServices: s.servicesRating ?? 3,
            overallExperience: s.overallRating ?? 3,
          },
        }))
        setStudentVoiceResponses(normalized)
      }
      if (aRes && Array.isArray(aRes.logs)) setAuditLogs(aRes.logs)
      if (kRes && Array.isArray(kRes.keys)) setAiKeys(kRes.keys)
      if (ewRes && Array.isArray(ewRes.earlyWarnings)) setEarlyWarnings(ewRes.earlyWarnings)
      if (docRes && Array.isArray(docRes.documents)) setDocuments(docRes.documents)
    }
    syncFromBackend()
    return () => { isMounted = false }
  }, [])

  // --- Actions ---

  const addRequest = useCallback((req: Omit<AdvisingRequest, 'id' | 'createdAt' | 'updatedAt'>): AdvisingRequest => {
    const newReq: AdvisingRequest = { ...req, id: nextId('REQ'), createdAt: now(), updatedAt: now() }
    setRequests(prev => [newReq, ...prev])
    api.createRequest(newReq).catch(() => {})
    return newReq
  }, [])

  const updateRequestStatus = useCallback((id: string, status: AdvisingRequest['status']) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status, updatedAt: now() } : r))
    api.updateRequestStatus(id, status).catch(() => {})
  }, [])

  const addAppointment = useCallback((apt: Omit<Appointment, 'id' | 'createdAt'>): Appointment => {
    const newApt: Appointment = { ...apt, id: nextId('APT'), createdAt: now() }
    setAppointments(prev => [newApt, ...prev])
    api.createAppointment(newApt).catch(() => {})
    return newApt
  }, [])

  const updateAppointmentStatus = useCallback((id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }, [])

  const confirmAppointment = useCallback((appointmentId: string) => {
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, studentConfirmed: true } : a))
  }, [])

  const declineAppointment = useCallback((appointmentId: string, reason?: string) => {
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, studentDeclined: true, studentDeclineReason: reason } : a))
  }, [])

  const addSession = useCallback((ses: Omit<AdvisingSession, 'id' | 'createdAt'>): AdvisingSession => {
    const newSes: AdvisingSession = { ...ses, id: nextId('SES'), createdAt: now() }
    setSessions(prev => [newSes, ...prev])
    api.createSession(newSes).catch(() => {})
    return newSes
  }, [])

  const addFollowUp = useCallback((fu: Omit<FollowUp, 'id' | 'createdAt'>): FollowUp => {
    const newFu: FollowUp = { ...fu, id: nextId('FU'), createdAt: now() }
    setFollowUps(prev => [newFu, ...prev])
    api.createFollowUp(newFu).catch(() => {})
    return newFu
  }, [])

  const updateFollowUpStatus = useCallback((id: string, status: FollowUp['status']) => {
    setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status, ...(status === 'completed' ? { completedAt: now() } : {}) } : f))
    api.updateFollowUpStatus(id, status).catch(() => {})
  }, [])

  const addFollowUpProgress = useCallback((fp: Omit<FollowUpProgress, 'id' | 'createdAt'>): FollowUpProgress => {
    const newFp: FollowUpProgress = { ...fp, id: nextId('FUP'), createdAt: now() }
    setFollowUpProgress(prev => [newFp, ...prev])
    api.saveFollowUpProgress(newFp).catch(() => {})
    return newFp
  }, [])

  const updateFollowUpProgress = useCallback((id: string, progress: number, notes: string) => {
    setFollowUpProgress(prev => prev.map(fp => fp.id === id ? { ...fp, progress, notes } : fp))
    api.saveFollowUpProgress({ id, progress, notes }).catch(() => {})
  }, [])

  const addRequestProgress = useCallback((rp: Omit<RequestProgress, 'id' | 'createdAt'>): RequestProgress => {
    const newRp: RequestProgress = { ...rp, id: nextId('RGP'), createdAt: now() }
    setRequestProgress(prev => [newRp, ...prev])
    return newRp
  }, [])

  const updateRequestProgress = useCallback((id: string, progress: number, notes: string) => {
    setRequestProgress(prev => prev.map(rp => rp.id === id ? { ...rp, progress, notes } : rp))
  }, [])

  const addReferral = useCallback((ref: Omit<Referral, 'id' | 'createdAt'>): Referral => {
    const newRef: Referral = { ...ref, id: nextId('REF'), createdAt: now() }
    setReferrals(prev => [newRef, ...prev])
    return newRef
  }, [])

  const updateReferralStatus = useCallback((id: string, status: Referral['status']) => {
    setReferrals(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }, [])

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'createdAt'>) => {
    setNotifications(prev => [{ ...n, id: nextId('NOT'), createdAt: now() }, ...prev])
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }, [])

  const markAllNotificationsRead = useCallback((userId: string) => {
    setNotifications(prev => prev.map(n => n.userId === userId ? { ...n, isRead: true } : n))
  }, [])

  const addEarlyWarning = useCallback((ew: Omit<EarlyWarningCase, 'id' | 'createdAt'>): EarlyWarningCase => {
    const newEw: EarlyWarningCase = { ...ew, id: nextId('EW'), createdAt: now() }
    setEarlyWarnings(prev => [newEw, ...prev])
    api.saveEarlyWarning(newEw).catch(() => {})
    return newEw
  }, [])

  const updateEarlyWarningStatus = useCallback((id: string, status: EarlyWarningCase['status']) => {
    setEarlyWarnings(prev => prev.map(e => e.id === id ? { ...e, status } : e))
  }, [])

  const addEarlyWarningFollowUp = useCallback((fw: Omit<EarlyWarningFollowUp, 'id' | 'createdAt'>): EarlyWarningFollowUp => {
    const newFw: EarlyWarningFollowUp = { ...fw, id: nextId('EWF'), createdAt: now() }
    setEarlyWarningFollowUps(prev => [newFw, ...prev])
    return newFw
  }, [])

  const updateEarlyWarningFollowUpStatus = useCallback((id: string, status: EarlyWarningFollowUp['status']) => {
    setEarlyWarningFollowUps(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }, [])

  const addExitCase = useCallback((ec: Omit<ExitCase, 'id' | 'createdAt' | 'updatedAt'>): ExitCase => {
    const newEc: ExitCase = { ...ec, id: nextId('EX'), createdAt: now(), updatedAt: now() }
    setExitCases(prev => [newEc, ...prev])
    api.createExitCase(newEc).catch(() => {})
    return newEc
  }, [])

  const updateExitCaseStatus = useCallback((id: string, status: ExitCase['status']) => {
    setExitCases(prev => prev.map(e => e.id === id ? { ...e, status, updatedAt: now() } : e))
    api.updateExitCase(id, { status }).catch(() => {})
  }, [])

  const addAdvisorAssessment = useCallback((a: Omit<AdvisorExitAssessment, 'id' | 'createdAt'>): AdvisorExitAssessment => {
    const newA: AdvisorExitAssessment = { ...a, id: nextId('AEA'), createdAt: now() }
    setAdvisorAssessments(prev => [newA, ...prev])
    return newA
  }, [])

  const updateAdvisorAssessmentResolution = useCallback((exitCaseId: string, resolution: string) => {
    setAdvisorAssessments(prev => {
      const exists = prev.some(a => a.exitCaseId === exitCaseId)
      if (exists) {
        return prev.map(a => a.exitCaseId === exitCaseId ? { ...a, resolution } : a)
      } else {
        return [{
          id: nextId('AEA'),
          exitCaseId,
          advisorId: '',
          assessment: 'Direct committee review',
          contributingFactors: '',
          actionsTaken: '',
          referralsMade: '',
          followUpAttempts: '',
          recommendation: '',
          resolution,
          createdAt: now(),
        }, ...prev]
      }
    })
  }, [])

  const markVoiceSurveyCompleted = useCallback((studentId: string) => {
    if (!studentId) return
    setCompletedVoiceStudents(prev => {
      if (prev.includes(studentId)) return prev
      const next = [...prev, studentId]
      try {
        localStorage.setItem('advising_log_voice_survey_completed_students', JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  const addStudentVoiceResponse = useCallback((svr: Omit<StudentVoiceResponse, 'id' | 'createdAt'>): StudentVoiceResponse => {
    const newSvr: StudentVoiceResponse = { ...svr, id: nextId('SVR'), createdAt: new Date().toISOString() }
    setStudentVoiceResponses(prev => [newSvr, ...prev])
    if (svr.studentId) {
      markVoiceSurveyCompleted(svr.studentId)
    }
    api.submitStudentVoice(newSvr).catch(() => {})
    return newSvr
  }, [markVoiceSurveyCompleted])

  const addDocument = useCallback((doc: Omit<StudentDocument, 'id'>): StudentDocument => {
    const newDoc: StudentDocument = { ...doc, id: nextId('DOC') }
    setDocuments(prev => [newDoc, ...prev])
    api.saveDocument(newDoc).catch(() => {})
    return newDoc
  }, [])

  const updateDocument = useCallback((id: string, updates: Partial<StudentDocument>) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === id) {
        const updated = { ...d, ...updates }
        api.saveDocument(updated).catch(() => {})
        return updated
      }
      return d
    }))
  }, [])

  const updateDocumentStatus = useCallback((id: string, status: StudentDocument['status']) => {
    setDocuments(prev => prev.map(d => {
      if (d.id === id) {
        const updated = { ...d, status }
        api.saveDocument(updated).catch(() => {})
        return updated
      }
      return d
    }))
  }, [])

  const deleteDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id))
    api.deleteDocument(id).catch(() => {})
  }, [])

  const addUser = useCallback((user: Omit<User, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): User => {
    const newUser: User = { ...user, id: user.id || nextId('USR'), createdAt: user.createdAt || now() }
    setUsers(prev => [...prev, newUser])
    api.saveUser(newUser).catch(() => {})
    return newUser
  }, [])

  const bulkAddUsers = useCallback(async (newUsersData: Partial<User>[]): Promise<User[]> => {
    const timestamp = now()
    const createdUsers: User[] = newUsersData.map((u, idx) => {
      const email = (u.email || '').trim()
      const prefix = email.split('@')[0] || `user_${idx + 1}`
      const isStu = /^\d/.test(prefix) || email.includes('@student.') || email.includes('@lamduan.')
      const assignedRole: UserRole = u.role || (isStu ? 'student' : 'advisor')

      let autoName = u.name?.trim()
      if (!autoName) {
        if (isStu) {
          const digitMatch = prefix.match(/^\d+/)
          autoName = digitMatch ? `Student ${digitMatch[0]}` : `Student ${prefix}`
        } else {
          const words = prefix.split(/[._\-\s]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          autoName = words.length > 0 ? words.join(' ') : prefix
        }
      }

      const autoCode = u.code || (isStu ? prefix.match(/^\d+/)?.[0] || prefix : `ADV${String(idx + 1).padStart(3, '0')}`)

      return {
        id: u.id || nextId(`USR_${Date.now()}_${idx}`),
        code: autoCode,
        name: autoName,
        email,
        role: assignedRole,
        department: u.department || 'School of Applied Digital Technology (ADT)',
        phone: u.phone,
        isActive: u.isActive !== undefined ? u.isActive : true,
        hasAiAccess: u.hasAiAccess !== undefined ? u.hasAiAccess : assignedRole !== 'student',
        createdAt: u.createdAt || timestamp,
      }
    })

    setUsers(prev => {
      const existingEmails = new Set(createdUsers.map(u => u.email.toLowerCase()))
      const filtered = prev.filter(u => !existingEmails.has(u.email.toLowerCase()))
      return [...filtered, ...createdUsers]
    })

    try {
      await api.bulkSaveUsers(createdUsers)
    } catch (_err) {}

    return createdUsers
  }, [])

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u))
  }, [])

  const deleteUser = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.deleteUser(id)
      if (res && res.success === false) {
        return { success: false, error: res.error || 'Failed to delete user' }
      }
      setUsers(prev => prev.filter(u => u.id !== id))
      setRoster(prev => prev.filter(r => r.studentId !== id && r.advisorId !== id))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete user' }
    }
  }, [])

  const addRosterEntry = useCallback((entry: Omit<StudentAdvisorAssignment, 'id' | 'assignedAt'>) => {
    const newEntry: StudentAdvisorAssignment = { ...entry, id: nextId('R'), assignedAt: now() }
    setRoster(prev => [...prev, newEntry])
    api.saveRosterEntry(newEntry).catch(() => {})
  }, [])

  const updateRosterEntry = useCallback((studentId: string, newAdvisorId: string) => {
    const entryData = {
      studentId,
      advisorId: newAdvisorId,
      assignedAt: now(),
      isActive: true,
    }
    setRoster(prev => {
      const exists = prev.some(r => r.studentId === studentId && r.isActive)
      if (exists) {
        return prev.map(r => (r.studentId === studentId && r.isActive ? { ...r, advisorId: newAdvisorId, assignedAt: now() } : r))
      } else {
        const newEntry: StudentAdvisorAssignment = {
          id: nextId('R'),
          ...entryData,
        }
        return [newEntry, ...prev]
      }
    })
    api.saveRosterEntry(entryData).catch(() => {})
  }, [])

  const addCategory = useCallback((cat: Omit<AdvisingCategoryConfig, 'id'>) => {
    setCategoryConfigs(prev => [...prev, { ...cat, id: nextId('CAT') }])
  }, [])

  const updateCategory = useCallback((id: string, updates: Partial<AdvisingCategoryConfig>) => {
    setCategoryConfigs(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }, [])

  const addDocumentType = useCallback((dt: Omit<DocumentType, 'id'>) => {
    setDocumentTypes(prev => [...prev, { ...dt, id: nextId('DT') }])
  }, [])

  const updateDocumentType = useCallback((id: string, updates: Partial<DocumentType>) => {
    setDocumentTypes(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d))
  }, [])

  const addAuditLog = useCallback((log: Omit<AuditLog, 'id' | 'createdAt'>) => {
    setAuditLogs(prev => [{ ...log, id: nextId('AL'), createdAt: new Date().toISOString() }, ...prev])
  }, [])

  const toggleAiApi = useCallback((enabled: boolean, adminName: string = 'Admin') => {
    setSystemApiConfig(prev => {
      const updated: SystemApiConfig = {
        ...prev,
        isAiApiEnabled: enabled,
        lastToggledAt: new Date().toISOString(),
        lastToggledBy: adminName,
      }
      localStorage.setItem('advising_log_system_api_config', JSON.stringify(updated))
      return updated
    })
  }, [])

  const toggleUserAiAccess = useCallback((userId: string, enabled: boolean, adminName: string = 'Admin') => {
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, hasAiAccess: enabled } : u)))
    const target = users.find(u => u.id === userId)
    setAuditLogs(prev => [
      {
        id: nextId('AL'),
        userId: 'ADM001',
        userName: adminName,
        userRole: 'admin',
        action: 'user_ai_access_toggled',
        description: `Admin ${enabled ? 'GRANTED' : 'REVOKED'} AI access for user ${target?.name || userId} (${target?.code || ''})`,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
  }, [users])


  const batchImportRoster = useCallback((
    entries: RosterImportEntry[],
    mode: 'upsert' | 'replace'
  ): RosterImportResult => {
    let addedCount = 0
    let updatedCount = 0
    let unchangedCount = 0
    let skippedCount = 0
    const errors: string[] = []
    const preview: RosterImportResult['preview'] = []

    const seenStudentCodes = new Set<string>()
    const validBatch: Array<{ student: User; advisor: User; rawEntry: RosterImportEntry }> = []

    for (const entry of entries) {
      const sCode = (entry.studentCode || '').trim()
      const aTarget = (entry.advisorCodeOrEmail || '').trim().toLowerCase()

      if (!sCode) {
        skippedCount++
        continue
      }

      if (seenStudentCodes.has(sCode)) {
        skippedCount++
        errors.push(`รหัสนักศึกษา ${sCode} ปรากฏซ้ำในชุดข้อมูล (ยึดรายการแรกและข้ามรายการซ้ำ)`)
        continue
      }
      seenStudentCodes.add(sCode)

      const student = users.find(
        u =>
          u.role === 'student' &&
          (u.code.toLowerCase() === sCode.toLowerCase() ||
            u.email.toLowerCase() === sCode.toLowerCase() ||
            u.email.toLowerCase().startsWith(sCode.toLowerCase()))
      )
      if (!student) {
        skippedCount++
        errors.push(`ไม่พบนักศึกษา "${sCode}" ในฐานข้อมูล (สามารถใช้รหัสนักศึกษาหรืออีเมล)`)
        preview.push({
          studentCode: sCode,
          studentName: 'ไม่พบในระบบ',
          newAdvisorName: aTarget,
          action: 'error',
          errorReason: `ไม่พบนักศึกษา "${sCode}"`,
        })
        continue
      }

      const advisor = users.find(u =>
        u.role === 'advisor' && (
          u.code.toLowerCase() === aTarget ||
          u.email.toLowerCase() === aTarget ||
          u.name.toLowerCase().includes(aTarget) ||
          u.id.toLowerCase() === aTarget
        )
      )

      if (!advisor) {
        skippedCount++
        errors.push(`ไม่พบอาจารย์ที่ปรึกษา "${aTarget}" สำหรับนักศึกษา ${sCode}`)
        preview.push({
          studentCode: sCode,
          studentName: student.name,
          newAdvisorName: 'ไม่พบอาจารย์',
          action: 'error',
          errorReason: `ไม่พบอาจารย์ "${aTarget}"`,
        })
        continue
      }

      validBatch.push({ student, advisor, rawEntry: entry })
    }

    // Persist imported batch to backend D1 database
    for (const item of validBatch) {
      api.saveRosterEntry({
        studentId: item.student.id,
        advisorId: item.advisor.id,
        assignedAt: now(),
        isActive: true,
      }).catch(() => {})
    }

    if (mode === 'replace') {
      // In replace mode: all active roster entries are replaced by this batch
      setRoster(prev => {
        const inactives = prev.filter(r => !r.isActive)
        const updatedList: StudentAdvisorAssignment[] = [...inactives]

        for (const item of validBatch) {
          const existing = prev.find(r => r.studentId === item.student.id && r.isActive)
          const oldAdvisor = existing ? users.find(u => u.id === existing.advisorId) : undefined

          updatedList.push({
            id: nextId('R'),
            studentId: item.student.id,
            advisorId: item.advisor.id,
            assignedAt: now(),
            isActive: true,
          })

          if (!existing) {
            addedCount++
            preview.push({
              studentCode: item.student.code,
              studentName: item.student.name,
              newAdvisorName: item.advisor.name,
              action: 'add',
            })
          } else if (existing.advisorId !== item.advisor.id) {
            updatedCount++
            preview.push({
              studentCode: item.student.code,
              studentName: item.student.name,
              oldAdvisorName: oldAdvisor?.name,
              newAdvisorName: item.advisor.name,
              action: 'update',
            })
          } else {
            unchangedCount++
            preview.push({
              studentCode: item.student.code,
              studentName: item.student.name,
              oldAdvisorName: oldAdvisor?.name,
              newAdvisorName: item.advisor.name,
              action: 'no_change',
            })
          }
        }

        return updatedList
      })
    } else {
      // In upsert mode (Default & Recommended):
      // - Updates existing active student assignment to new advisor (no duplicate rows)
      // - Adds new assignment if student has no prior active assignment
      // - Unmentioned students remain completely untouched!
      setRoster(prev => {
        const nextRoster = [...prev]

        for (const item of validBatch) {
          const existingIdx = nextRoster.findIndex(r => r.studentId === item.student.id && r.isActive)

          if (existingIdx >= 0) {
            const existing = nextRoster[existingIdx]
            const oldAdvisor = users.find(u => u.id === existing.advisorId)

            if (existing.advisorId === item.advisor.id) {
              unchangedCount++
              preview.push({
                studentCode: item.student.code,
                studentName: item.student.name,
                oldAdvisorName: oldAdvisor?.name,
                newAdvisorName: item.advisor.name,
                action: 'no_change',
              })
            } else {
              updatedCount++
              nextRoster[existingIdx] = {
                ...existing,
                advisorId: item.advisor.id,
                assignedAt: now(),
              }
              preview.push({
                studentCode: item.student.code,
                studentName: item.student.name,
                oldAdvisorName: oldAdvisor?.name,
                newAdvisorName: item.advisor.name,
                action: 'update',
              })
            }
          } else {
            addedCount++
            nextRoster.push({
              id: nextId('R'),
              studentId: item.student.id,
              advisorId: item.advisor.id,
              assignedAt: now(),
              isActive: true,
            })
            preview.push({
              studentCode: item.student.code,
              studentName: item.student.name,
              newAdvisorName: item.advisor.name,
              action: 'add',
            })
          }
        }

        return nextRoster
      })
    }

    return {
      mode,
      totalRows: entries.length,
      addedCount,
      updatedCount,
      unchangedCount,
      skippedCount,
      errors,
      preview,
    }
  }, [users])

  const addAiKey = useCallback(async (name: string, key: string, isDefault?: boolean) => {
    // 1. Send to backend D1 database
    const res = await api.addAiKey(name, key, isDefault)
    if (res && res.key) {
      // Re-sync all keys from backend
      await refreshAiKeys()
    } else {
      // Fallback local state if offline
      setAiKeys(prev => {
        const makeDefault = prev.length === 0 || Boolean(isDefault)
        const updated = makeDefault ? prev.map(k => ({ ...k, isDefault: false })) : [...prev]
        const masked = key.length > 8 ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : '••••••••'
        return [
          {
            id: `KEY_${Date.now()}`,
            name: name || `Gemini Key ${now()}`,
            maskedKey: masked,
            isDefault: makeDefault,
            provider: 'Google Gemini',
            model: 'gemini-1.5-flash',
            status: 'active' as const,
            createdAt: now(),
            lastTestedAt: null,
          },
          ...updated,
        ]
      })
    }
  }, [refreshAiKeys])

  const setDefaultAiKey = useCallback(async (id: string) => {
    // 1. Send to backend
    await api.setDefaultAiKey(id)
    // 2. Update local state
    setAiKeys(prev => prev.map(k => ({ ...k, isDefault: k.id === id })))
  }, [])

  const deleteAiKey = useCallback(async (id: string) => {
    // 1. Send to backend
    await api.deleteAiKey(id)
    // 2. Update local state
    setAiKeys(prev => {
      const target = prev.find(k => k.id === id)
      const remaining = prev.filter(k => k.id !== id)
      if (target?.isDefault && remaining.length > 0) {
        remaining[0] = { ...remaining[0], isDefault: true }
      }
      return remaining
    })
  }, [])

  const store: Store = {
    users, roster, requests, appointments, sessions, followUps, referrals,
    notifications, earlyWarnings, earlyWarningFollowUps, followUpProgress, requestProgress, exitCases, advisorAssessments, studentVoiceResponses, completedVoiceStudents, documents,
    categoryConfigs, documentTypes, auditLogs, systemApiConfig, aiKeys,
    addRequest, updateRequestStatus,
    addAppointment, updateAppointmentStatus,
    confirmAppointment, declineAppointment,
    addSession,
    addFollowUp, updateFollowUpStatus,
    addFollowUpProgress, updateFollowUpProgress,
    addRequestProgress, updateRequestProgress,
    addReferral, updateReferralStatus,
    addNotification, markNotificationRead, markAllNotificationsRead,
    addEarlyWarning, updateEarlyWarningStatus,
    addEarlyWarningFollowUp, updateEarlyWarningFollowUpStatus,
    addExitCase, updateExitCaseStatus,
    addAdvisorAssessment, updateAdvisorAssessmentResolution,
    addStudentVoiceResponse, markVoiceSurveyCompleted,
    addDocument, updateDocument, updateDocumentStatus, deleteDocument,
    addUser, bulkAddUsers, updateUser, deleteUser,
    addRosterEntry, updateRosterEntry, batchImportRoster,
    toggleAiApi, toggleUserAiAccess,
    addAiKey, setDefaultAiKey, deleteAiKey, refreshAiKeys,
    addCategory, updateCategory,
    addDocumentType, updateDocumentType,
    addAuditLog,
  }


  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
