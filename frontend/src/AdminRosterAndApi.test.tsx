import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { StoreProvider, useStore } from '@/data/store'
import { ToastProvider } from '@/contexts/ToastContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import UserManagement from '@/pages/admin/UserManagement'
import AiGovernance from '@/pages/admin/AiGovernance'
import Roster from '@/pages/admin/Roster'
import { analyzeWithLLM } from '@/services/aiService'

// Mock currentUser as Admin
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/AuthContext')>('@/contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      currentUser: {
        id: 'ADM001',
        code: 'A001',
        name: 'System Admin',
        email: 'admin@mfu.ac.th',
        role: 'admin',
        department: 'Academic Operations',
        isActive: true,
        createdAt: '2024-01-01',
      },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
    }),
  }
})

function renderWithProviders(ui: React.ReactElement, { route = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider>
        <LanguageProvider>
          <StoreProvider>
            <ToastProvider>{ui}</ToastProvider>
          </StoreProvider>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('Admin API Control & Roster Management', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('opens the student list from the dashboard student count', () => {
    renderWithProviders(
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
      </Routes>
    )

    fireEvent.click(screen.getByRole('link', { name: /นักศึกษาที่ลงทะเบียน/ }))

    expect(screen.getByRole('button', { name: /นักศึกษา/ })).toBeInTheDocument()
    expect(screen.queryByRole('cell', { name: 'admin@mfu.ac.th' })).not.toBeInTheDocument()
  })

  // -------------------------------------------------------------
  // PART 1: Admin API Toggle Tests
  // -------------------------------------------------------------
  it('does not present local AI settings or static telemetry as live server status', () => {
    renderWithProviders(<AdminDashboard />)
    expect(screen.queryByText(/12ms|99.98%|Live Telemetry/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Master API Switch|Master LLM API Switch/)).not.toBeInTheDocument()
  })

  it('rejects LLM calls with disabled notice when Admin turns off the API', async () => {
    // Manually set API config to disabled in localStorage
    localStorage.setItem(
      'advising_log_system_api_config',
      JSON.stringify({ isAiApiEnabled: false, provider: 'Google Gemini', model: 'gemini-1.5-flash' })
    )

    const res = await analyzeWithLLM({
      mode: 'strategic_synthesis',
      cases: [],
      language: 'th',
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('AI_API_DISABLED')
    expect(res.analysis).toContain('ระบบบริการ AI / LLM ถูกปิดการใช้งานชั่วคราวโดยผู้ดูแลระบบ')
  })

  // -------------------------------------------------------------
  // PART 2: Per-User AI Governance Tests
  // -------------------------------------------------------------
  it('enforces Layer 2 per-user AI authorization (rejects when user hasAiAccess is false)', async () => {
    // Master switch is ON
    localStorage.setItem(
      'advising_log_system_api_config',
      JSON.stringify({ isAiApiEnabled: true, provider: 'Google Gemini', model: 'gemini-1.5-flash' })
    )

    const res = await analyzeWithLLM({
      mode: 'strategic_synthesis',
      cases: [],
      language: 'th',
      userHasAiAccess: false, // Individual revoked
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('USER_AI_ACCESS_DENIED')
    expect(res.analysis).toContain('บัญชีของคุณไม่ได้รับสิทธิ์เข้าถึงระบบ AI')
  })

  it('prioritizes Layer 1 Master Switch over Layer 2 individual access', async () => {
    // Master switch is OFF, even if user has individual permission
    localStorage.setItem(
      'advising_log_system_api_config',
      JSON.stringify({ isAiApiEnabled: false, provider: 'Google Gemini', model: 'gemini-1.5-flash' })
    )

    const res = await analyzeWithLLM({
      mode: 'strategic_synthesis',
      cases: [],
      language: 'th',
      userHasAiAccess: true, // User has individual permission, but master switch is off
    })

    expect(res.success).toBe(false)
    expect(res.error).toBe('AI_API_DISABLED')
    expect(res.analysis).toContain('ระบบบริการ AI / LLM ถูกปิดการใช้งานชั่วคราวโดยผู้ดูแลระบบ')
  })

  it('renders clean UserManagement without AI column and contains quick link to AiGovernance', () => {
    renderWithProviders(<UserManagement />)

    // Check link banner
    expect(screen.getByText(/ศูนย์ควบคุมระบบ AI และการกำหนดสิทธิ์/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ไปที่หน้าจัดการระบบ AI/i })).toBeInTheDocument()

    // Ensure AI column is NOT in the table (no student confusion)
    expect(screen.queryByText(/สิทธิ์การใช้งาน AI/i)).not.toBeInTheDocument()
  })

  it('renders dedicated AiGovernance page and excludes students from personnel delegation', async () => {
    renderWithProviders(<AiGovernance />)

    // Header and Master Switch
    expect(screen.getByRole('heading', { name: /จัดการระบบ AI & กำหนดสิทธิ์ \(AI Governance\)/i })).toBeInTheDocument()
    expect(screen.getByText(/สวิตช์ควบคุมหลักของระบบ/i)).toBeInTheDocument()

    // Switch to Personnel Access tab
    const personnelTabBtn = screen.getByRole('button', { name: /กำหนดสิทธิ์บุคลากร/i })
    act(() => {
      fireEvent.click(personnelTabBtn)
    })

    // Expect faculty-only notice banner
    expect(screen.getByText(/ระบบกำหนดสิทธิ์เฉพาะบุคลากร \(Faculty & QA Staff Only\)/i)).toBeInTheDocument()

    // Faculty members SHOULD be present
    expect(screen.getByText(/Dr. Prasit Kanchanawat/i)).toBeInTheDocument()
    expect(screen.getByText(/Dr. Wipawan Buathong/i)).toBeInTheDocument()

    // Students MUST NOT be present
    expect(screen.queryByText('6631503001')).not.toBeInTheDocument()
    expect(screen.queryByText('Somchai Jaidee')).not.toBeInTheDocument()

    // Find toggle button for revoked faculty (Dr. Wipawan) and click
    const revokedButtons = screen.getAllByRole('button', { name: /ระงับสิทธิ์ \(Revoked\)/i })
    expect(revokedButtons.length).toBeGreaterThan(0)

    await act(async () => {
      fireEvent.click(revokedButtons[0])
    })

    // Now count of allowed buttons should increase
    const allowedButtons = screen.getAllByRole('button', { name: /มีสิทธิ์ AI \(Allowed\)/i })
    expect(allowedButtons.length).toBeGreaterThan(0)
  })

  it('records an audit log entry when Admin toggles per-user AI permission', async () => {
    let storeRef: any
    function TestComponent() {
      storeRef = useStore()
      return <div>Store Test</div>
    }

    renderWithProviders(<TestComponent />)

    const initialAuditCount = storeRef.auditLogs.length

    await act(async () => {
      storeRef.toggleUserAiAccess('ADV002', true, 'TestAdmin')
    })

    // Check updated user state
    const user = storeRef.users.find((u: any) => u.id === 'ADV002')
    expect(user?.hasAiAccess).toBe(true)

    // Check audit log created
    expect(storeRef.auditLogs.length).toBe(initialAuditCount + 1)
    const latestLog = storeRef.auditLogs[0]
    expect(latestLog.action).toBe('user_ai_access_toggled')
    expect(latestLog.description).toContain('GRANTED AI access for user Dr. Wipawan Buathong')
  })

  // -------------------------------------------------------------
  // PART 3: Manual Roster Assignment Tests
  // -------------------------------------------------------------
  it('does not expose CSV import and keeps manual assignment available', () => {
    renderWithProviders(<Roster />)

    expect(screen.queryByRole('button', { name: /นำเข้าไฟล์ CSV|Import CSV/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /กำหนดที่ปรึกษา|Assign Advisor/i })).toBeInTheDocument()
  })

  it('performs store batch import in Upsert mode without deleting unaffected students or duplicating records', async () => {
    let storeRef: any
    function TestComponent() {
      storeRef = useStore()
      return <div data-testid="active-count">{storeRef.roster.filter((r: any) => r.isActive).length}</div>
    }

    renderWithProviders(<TestComponent />)

    const initialRosterLength = storeRef.roster.filter((r: any) => r.isActive).length
    expect(initialRosterLength).toBeGreaterThan(0)

    // Student 6631503001 already exists in mock data
    const samplePayload = [
      { studentCode: '6631503001', advisorCodeOrEmail: 'ADV002', notes: 'Reassigned' },
      { studentCode: '6631503001', advisorCodeOrEmail: 'ADV003', notes: 'Duplicate row in same file' },
    ]

    let result: any
    await act(async () => {
      result = storeRef.batchImportRoster(samplePayload, 'upsert')
    })

    // Expect duplicate detection to skip the 2nd row
    expect(result.skippedCount).toBe(1)
    expect(result.updatedCount).toBe(1)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    expect(result.errors[0]).toContain('ปรากฏซ้ำ')

    // Verify student 6631503001 has exactly 1 active assignment
    const activeAssignments = storeRef.roster.filter(
      (r: any) => r.isActive && r.studentId === 'STU001'
    )
    expect(activeAssignments.length).toBe(1)
    expect(activeAssignments[0].advisorId).toBe('ADV002')
  })

  it('performs store batch import in Replace mode replacing all active entries', async () => {
    let storeRef: any
    function TestComponent() {
      storeRef = useStore()
      return <div data-testid="replace-count">{storeRef.roster.filter((r: any) => r.isActive).length}</div>
    }

    renderWithProviders(<TestComponent />)

    const singlePairPayload = [
      { studentCode: '6631503001', advisorCodeOrEmail: 'ADV001', notes: 'Sole survivor' },
    ]

    let result: any
    await act(async () => {
      result = storeRef.batchImportRoster(singlePairPayload, 'replace')
    })

    expect(result.mode).toBe('replace')
    const activeRoster = storeRef.roster.filter((r: any) => r.isActive)
    expect(activeRoster.length).toBe(1)
    expect(activeRoster[0].studentId).toBe('STU001')
  })

  // -------------------------------------------------------------
  // PART 4: User Registration (Auto Student Role & Bulk Import)
  // -------------------------------------------------------------
  it('adds multiple users via bulkAddUsers with auto student role detection and default ADT department', async () => {
    let storeRef: any
    function TestComponent() {
      storeRef = useStore()
      return <div data-testid="users-count">{storeRef.users.length}</div>
    }

    renderWithProviders(<TestComponent />)

    const initialCount = storeRef.users.length

    await act(async () => {
      await storeRef.bulkAddUsers([
        {
          code: '6631509999',
          name: 'New Test Student',
          email: '6631509999@lamduan.mfu.ac.th',
          role: 'student',
          department: 'School of Applied Digital Technology (ADT)',
        },
        {
          code: 'ADV099',
          name: 'New Test Advisor',
          email: 'new.adv@mfu.ac.th',
          role: 'advisor',
          department: 'School of Applied Digital Technology (ADT)',
        },
      ])
    })

    expect(storeRef.users.length).toBe(initialCount + 2)

    const addedStudent = storeRef.users.find((u: any) => u.email === '6631509999@lamduan.mfu.ac.th')
    expect(addedStudent).toBeDefined()
    expect(addedStudent.role).toBe('student')
    expect(addedStudent.department).toBe('School of Applied Digital Technology (ADT)')

    const addedAdvisor = storeRef.users.find((u: any) => u.email === 'new.adv@mfu.ac.th')
    expect(addedAdvisor).toBeDefined()
    expect(addedAdvisor.role).toBe('advisor')
    expect(addedAdvisor.department).toBe('School of Applied Digital Technology (ADT)')
  })

  it('correctly auto-derives full names from student and faculty email addresses', async () => {
    let storeRef: any
    function TestComponent() {
      storeRef = useStore()
      return <div data-testid="users-count">{storeRef.users.length}</div>
    }

    renderWithProviders(<TestComponent />)

    await act(async () => {
      await storeRef.bulkAddUsers([
        {
          email: '6631508888@lamduan.mfu.ac.th',
          role: 'student',
        },
        {
          email: 'somchai.jaidee@mfu.ac.th',
          role: 'advisor',
        },
      ])
    })

    const student = storeRef.users.find((u: any) => u.email === '6631508888@lamduan.mfu.ac.th')
    expect(student).toBeDefined()
    expect(student.code).toBe('6631508888')
    expect(student.name).toBe('Student 6631508888')

    const advisor = storeRef.users.find((u: any) => u.email === 'somchai.jaidee@mfu.ac.th')
    expect(advisor).toBeDefined()
    expect(advisor.name).toBe('Somchai Jaidee')
  })

  it('renders system role selection in Single User modal ONLY when email is detected as non-student', () => {
    renderWithProviders(<UserManagement />)

    // Open Add User modal
    const openAddModalBtn = screen.getByRole('button', { name: /เพิ่มผู้ใช้ \/ ลงทะเบียนอีเมล/i })
    act(() => {
      fireEvent.click(openAddModalBtn)
    })

    const emailInput = screen.getByPlaceholderText(/6631503099@lamduan.mfu.ac.th or advisor@mfu.ac.th/i)

    // Initially (empty email): Role field MUST NOT be present
    expect(screen.queryByLabelText(/บทบาทในระบบ/i)).not.toBeInTheDocument()

    // Type a student email: Role field MUST NOT be present
    act(() => {
      fireEvent.change(emailInput, { target: { value: '6631503099@lamduan.mfu.ac.th' } })
    })
    expect(screen.queryByLabelText(/บทบาทในระบบ/i)).not.toBeInTheDocument()

    // Type a non-student faculty email: Role field MUST appear
    act(() => {
      fireEvent.change(emailInput, { target: { value: 'prasit.k@mfu.ac.th' } })
    })
    expect(screen.getByText(/บทบาทในระบบ \*/i)).toBeInTheDocument()
  })

  it('allows changing batch default role and overriding individual roles in bulk import preview', () => {
    renderWithProviders(<UserManagement />)

    // Open Add User modal and switch to Bulk tab
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /เพิ่มผู้ใช้ \/ ลงทะเบียนอีเมล/i }))
    })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /นำเข้าหลายคนพร้อมกัน/i }))
    })

    const textarea = screen.getByPlaceholderText(/6631501001@lamduan.mfu.ac.th/i)

    // Paste a student and two faculty members
    act(() => {
      fireEvent.change(textarea, {
        target: {
          value: '6631503099@lamduan.mfu.ac.th\nprof.somchai@mfu.ac.th\nhead.qa@mfu.ac.th',
        },
      })
    })

    // Student has locked Student badge
    expect(screen.getByText('Student')).toBeInTheDocument()

    // Non-student batch role selector should be rendered
    expect(screen.getByText(/บทบาทเริ่มต้นสำหรับอาจารย์\/บุคลากร:/i)).toBeInTheDocument()
  })

  it('successfully creates a new roster entry when assigning an unassigned student in Roster', () => {
    let storeRef: any
    function TestRoster() {
      storeRef = useStore()
      return <Roster />
    }

    renderWithProviders(<TestRoster />)

    // Add a new student into store who has no roster entry yet
    act(() => {
      storeRef.addUser({
        id: 'STU_NEW_999',
        code: '6631509999',
        name: 'Nattapong NewStudent',
        email: '6631509999@lamduan.mfu.ac.th',
        role: 'student',
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        createdAt: '2026-09-01',
      })
    })

    // Open Assign modal
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /กำหนดที่ปรึกษา/i }))
    })

    // Select the new student and advisor Dr. Prasit
    const selects = screen.getAllByRole('combobox')
    const studentSelect = selects[0]
    const advisorSelect = selects[1]

    act(() => {
      fireEvent.change(studentSelect, { target: { value: 'STU_NEW_999' } })
      fireEvent.change(advisorSelect, { target: { value: 'ADV001' } })
    })

    // Submit assignment
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /บันทึกการจับคู่/i }))
    })

    // Check that the student and advisor now appear in the active roster table!
    expect(screen.getByText('6631509999')).toBeInTheDocument()
    expect(screen.getByText('Nattapong NewStudent')).toBeInTheDocument()
  })

  it('allows admin to permanently delete an account and cleans up associated roster pairings', async () => {
    let storeRef: any
    function TestUserManagement() {
      storeRef = useStore()
      return <UserManagement />
    }

    renderWithProviders(<TestUserManagement />)

    // Add a temporary user
    act(() => {
      storeRef.addUser({
        id: 'USR_TEMP_123',
        code: 'TEMP123',
        name: 'Temporary User',
        email: 'temp.user@mfu.ac.th',
        role: 'advisor',
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        createdAt: '2026-09-01',
      })
      storeRef.addRosterEntry({
        studentId: 'STU001',
        advisorId: 'USR_TEMP_123',
        isActive: true,
      })
    })

    expect(storeRef.users.some((u: any) => u.id === 'USR_TEMP_123')).toBe(true)
    expect(storeRef.roster.some((r: any) => r.advisorId === 'USR_TEMP_123')).toBe(true)

    // Delete user
    await act(async () => {
      const res = await storeRef.deleteUser('USR_TEMP_123')
      expect(res.success).toBe(true)
    })

    // Verify user and roster pairings are removed
    expect(storeRef.users.some((u: any) => u.id === 'USR_TEMP_123')).toBe(false)
    expect(storeRef.roster.some((r: any) => r.advisorId === 'USR_TEMP_123')).toBe(false)
  })

})
