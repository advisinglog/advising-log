import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/data/mock-store'
import { ToastProvider } from '@/contexts/ToastContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import StudentVoiceSurvey from '@/pages/student/StudentVoiceSurvey'
import RequestAdvising from '@/pages/student/RequestAdvising'
import QADashboard from '@/pages/qa/QADashboard'

const studentUser = {
  id: 'STU001',
  code: '6631503001',
  name: 'Somchai Jaidee',
  email: 'somchai.j@student.mfu.ac.th',
  role: 'student',
  department: 'School of Applied Digital Technology (ADT)',
  isActive: true,
  hasAiAccess: false,
  createdAt: '2024-06-01',
}

let mockUser: any = { ...studentUser }

// Mock currentUser
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/AuthContext')>('@/contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      currentUser: mockUser,
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
            <ToastProvider>
              {ui}
            </ToastProvider>
          </StoreProvider>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('Student Voice Feature', () => {
  it('renders the Student Voice voluntary survey page with all core sections and AUN-QA banner', () => {
    renderWithProviders(<StudentVoiceSurvey />)

    // Heading and voluntary disclaimer
    expect(screen.getByRole('heading', { name: /เสียงของนักศึกษา/i })).toBeInTheDocument()
    expect(screen.getByText(/AUN-QA Criteria 6 & 8/i)).toBeInTheDocument()
    expect(screen.getByText(/แบบสอบถามโดยสมัครใจ/i)).toBeInTheDocument()

    // Core sections
    expect(screen.getByRole('heading', { name: /ข้อมูลสถานะและการไม่ระบุตัวตน/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ปัจจัยสำคัญที่มีผลต่อการตัดสินใจ/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /การประเมินประสบการณ์การเรียนรู้/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /เล่าด้วยคำพูดของตนเอง/i })).toBeInTheDocument()
  })

  it('allows student to toggle anonymous mode and select factors', async () => {
    renderWithProviders(<StudentVoiceSurvey />)

    const anonButton = screen.getByText(/ระบุตัวตนนักศึกษา/i)
    act(() => {
      fireEvent.click(anonButton)
    })
    expect(screen.getByText(/โหมดไม่ระบุตัวตน/i)).toBeInTheDocument()

    // Select a factor
    const factorBtn = screen.getByText(/ปัญหาทางการเงินและค่าครองชีพ/i)
    act(() => {
      fireEvent.click(factorBtn)
    })

    // Type open feedback
    const textareas = screen.getAllByRole('textbox')
    expect(textareas.length).toBeGreaterThanOrEqual(3)
    act(() => {
      fireEvent.change(textareas[0], { target: { value: 'อยากให้มีทุนสนับสนุนฉุกเฉิน' } })
    })
    expect(textareas[0]).toHaveValue('อยากให้มีทุนสนับสนุนฉุกเฉิน')

    // Submit survey
    const submitBtn = screen.getByRole('button', { name: /ส่งแบบสอบถามเสียงของนักศึกษา/i })
    act(() => {
      fireEvent.click(submitBtn)
    })

    // Expect success thank you screen
    expect(screen.getByText(/ขอบคุณสำหรับทุกเสียงสะท้อนของคุณ/i)).toBeInTheDocument()
  })

  it('renders Student Voice tab and metrics in QA Dashboard', () => {
    renderWithProviders(<QADashboard />)

    // Check tab button exists
    const tabBtn = screen.getByRole('button', { name: /เสียงของนักศึกษา/i })
    expect(tabBtn).toBeInTheDocument()

    // Switch to Student Voice tab
    act(() => {
      fireEvent.click(tabBtn)
    })

    // Check qualitative analysis view
    expect(screen.getByText(/ข้อมูลเชิงคุณภาพเสียงของนักศึกษา/i)).toBeInTheDocument()
    expect(screen.getByText(/ความพึงพอใจต่อหลักสูตร/i)).toBeInTheDocument()
    expect(screen.getByText(/เสียงสะท้อนและความคิดเห็นของนักศึกษา/i)).toBeInTheDocument()
  })

  it('renders Qualitative Exit Analysis tab in QA Dashboard and displays why students resign vs why they take leave', () => {
    renderWithProviders(<QADashboard />)

    // Check Qualitative Exit Analysis tab button exists
    const qualitativeTabBtn = screen.getByRole('button', { name: /วิเคราะห์เจาะลึกทำไมลาออก/i })
    expect(qualitativeTabBtn).toBeInTheDocument()

    // Switch to Qualitative Exit Analysis tab
    act(() => {
      fireEvent.click(qualitativeTabBtn)
    })

    // Check header and AUN-QA criteria banner
    expect(screen.getByText(/การวิเคราะห์ปัญหาเชิงคุณภาพ: ทำไมเด็กลาออก \/ พักการศึกษา\?/i)).toBeInTheDocument()
    expect(screen.getByText(/AUN-QA Criteria 6\.4 & 8\.3/i)).toBeInTheDocument()

    // Check Comparative "Why Resign vs Why Leave" Section
    expect(screen.getByText(/เปรียบเทียบสาเหตุ: "ทำไมเด็กลาออก\?" VS "ทำไมเด็กขอพักการศึกษา\?"/i)).toBeInTheDocument()
    expect(screen.getByText(/กลุ่มขอลาออกถาวร \(Permanent Withdrawal \/ Drop-out\)/i)).toBeInTheDocument()
    expect(screen.getByText(/กลุ่มขอพักการศึกษาชั่วคราว \(Leave of Absence\)/i)).toBeInTheDocument()

    // Check Thematic Root-Cause Synthesis
    expect(screen.getByText(/Thematic Qualitative Problem Synthesis|การสังเคราะห์ปัญหาเชิงคุณภาพ/i)).toBeInTheDocument()
    expect(screen.getByText(/Academic & Rigor|วิชาการ & หลักสูตร/i)).toBeInTheDocument()
    expect(screen.getByText(/Mental Health & Well-being|สุขภาพจิต & สุขภาวะ/i)).toBeInTheDocument()

    // Check Case-by-Case Qualitative Explorer
    expect(screen.getByText(/สำรวจเคสและเจาะลึกปัญหาเชิงคุณภาพรายกรณี/i)).toBeInTheDocument()
  })

  it('allows clicking Full Diagnostic Profile modal in Qualitative Case Explorer', () => {
    renderWithProviders(<QADashboard />)

    // Switch to Qualitative Exit Analysis tab
    const qualitativeTabBtn = screen.getByRole('button', { name: /วิเคราะห์เจาะลึกทำไมลาออก/i })
    act(() => {
      fireEvent.click(qualitativeTabBtn)
    })

    // Click on the first Full Diagnostic Profile button
    const profileButtons = screen.getAllByRole('button', { name: /ดูผลวินิจฉัยฉบับเต็ม/i })
    expect(profileButtons.length).toBeGreaterThan(0)
    act(() => {
      fireEvent.click(profileButtons[0])
    })

    // Expect modal to open
    expect(screen.getByText(/แฟ้มประเมินปัญหาเชิงคุณภาพกรณีขอลาออก \/ ลาพัก/i)).toBeInTheDocument()
    expect(screen.getByText(/การวินิจฉัยเชิงลึกของอาจารย์ที่ปรึกษา/i)).toBeInTheDocument()
  })

  const qaUser = {
    id: 'QA001',
    code: 'EMP-2001',
    name: 'Assoc. Prof. Rattana Pongsakorn',
    email: 'rattana.p@mfu.ac.th',
    role: 'qa_chair',
    department: 'School of Applied Digital Technology (ADT)',
    isActive: true,
    hasAiAccess: true,
    createdAt: '2018-01-01',
  }

  it('renders AI Qualitative Analysis and triggers strategic synthesis', async () => {
    mockUser = qaUser
    renderWithProviders(<QADashboard />)

    // Switch to Qualitative Exit Analysis tab
    const qualitativeTabBtn = screen.getByRole('button', { name: /วิเคราะห์เจาะลึกทำไมลาออก/i })
    act(() => {
      fireEvent.click(qualitativeTabBtn)
    })

    // Expect AI card
    expect(screen.getByText(/ผู้ช่วย AI วิเคราะห์ปัญหาเชิงคุณภาพ/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /บทวิเคราะห์เชิงกลยุทธ์/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ถาม-ตอบกับ AI/i })).toBeInTheDocument()

    // Trigger AI Strategic Synthesis
    const runAiBtn = screen.getAllByRole('button', { name: /วิเคราะห์ภาพรวมเชิงกลยุทธ์ด้วย AI/i })[0]
    await act(async () => {
      fireEvent.click(runAiBtn)
    })

    // Expect AI generated synthesis output
    expect(await screen.findByText(/บทวิเคราะห์เชิงคุณภาพระดับหลักสูตร/i)).toBeInTheDocument()
    expect(screen.getByText(/จุดตัดสำคัญ/i)).toBeInTheDocument()
  })

  it('supports switching to Interactive AI chat and sending prompts', async () => {
    mockUser = qaUser
    renderWithProviders(<QADashboard />)

    const qualitativeTabBtn = screen.getByRole('button', { name: /วิเคราะห์เจาะลึกทำไมลาออก/i })
    act(() => {
      fireEvent.click(qualitativeTabBtn)
    })

    // Switch to Chat mode
    const chatModeBtn = screen.getByRole('button', { name: /ถาม-ตอบกับ AI/i })
    act(() => {
      fireEvent.click(chatModeBtn)
    })

    // Expect suggested prompt chip
    const chipBtn = screen.getByRole('button', { name: /ทำไมเด็กปี 1 ถึงลาออกเยอะ\?/i })
    expect(chipBtn).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(chipBtn)
    })

    // Expect AI response in chat history
    expect(await screen.findByText(/คำตอบเชิงคุณภาพจากระบบ AI/i)).toBeInTheDocument()
  })


  it('does not expose API Key configuration modal or button in QA view', () => {
    mockUser = qaUser
    renderWithProviders(<QADashboard />)

    const qualitativeTabBtn = screen.getByRole('button', { name: /วิเคราะห์เจาะลึกทำไมลาออก/i })
    act(() => {
      fireEvent.click(qualitativeTabBtn)
    })

    expect(screen.queryByRole('button', { name: /API Key/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/ตั้งค่า Google Gemini API Key/i)).not.toBeInTheDocument()
  })

  it('enforces mandatory Student Voice survey in RequestAdvising when category is withdrawal_leave', async () => {
    mockUser = { ...studentUser }
    renderWithProviders(<RequestAdvising />, { route: '/student/request?category=withdrawal_leave' })

    // Check page title
    expect(screen.getByRole('heading', { name: /ยื่นคำร้องขอรับคำปรึกษา/i })).toBeInTheDocument()

    // Check 3 consolidated options
    expect(screen.getByRole('button', { name: /ขอลาออก/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ลาพักการศึกษา/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ย้ายสาขาวิชา/i })).toBeInTheDocument()

    // Check Student Voice survey notice
    expect(screen.getByText(/แบบสำรวจเสียงของนักศึกษา/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /ยืนยันส่งคำร้อง/i })
    expect(submitBtn).toBeDisabled()

    // Button to navigate to the official Student Voice page exists
    const surveyLinkBtn = screen.getByRole('button', { name: /ไปทำแบบสำรวจ Student Voice/i })
    expect(surveyLinkBtn).toBeInTheDocument()
  })

  it('allows submit when student has already completed Student Voice survey', () => {
    // STU006 has an existing response in mockStudentVoiceResponses
    mockUser = {
      id: 'STU006',
      code: '6631503006',
      name: 'Vichai Srisuk',
      email: 'vichai.s@student.mfu.ac.th',
      role: 'student',
      department: 'School of Applied Digital Technology (ADT)',
      isActive: true,
      hasAiAccess: false,
      createdAt: '2024-06-01',
    }

    renderWithProviders(<RequestAdvising />, { route: '/student/request?category=withdrawal_leave' })

    // Check status shows completed
    expect(screen.getByText(/ทำแบบสำรวจเรียบร้อยแล้ว/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /ยืนยันส่งคำร้อง/i })
    expect(submitBtn).not.toBeDisabled()
  })

  it('allows submit in RequestAdvising when survey was submitted in anonymous mode without infinite redirect', () => {
    mockUser = { ...studentUser }
    // Simulate student completed anonymous survey saved in localStorage/sessionStorage
    sessionStorage.setItem(`student_voice_completed_${studentUser.id}`, 'true')

    renderWithProviders(<RequestAdvising />, { route: '/student/request?category=withdrawal_leave' })

    // Check status shows completed even though response payload was anonymous
    expect(screen.getByText(/บันทึกข้อมูลเสียงของนักศึกษาเรียบร้อยแล้ว/i)).toBeInTheDocument()
    expect(screen.getByText(/ทำแบบสำรวจเรียบร้อยแล้ว/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /ยืนยันส่งคำร้อง/i })
    expect(submitBtn).not.toBeDisabled()
    sessionStorage.clear()
  })

  it('displays completion banner with continue button when student revisits Student Voice survey', () => {
    // STU006 has completed survey in mock data
    mockUser = {
      id: 'STU006',
      code: '6631503006',
      name: 'Vichai Srisuk',
      email: 'vichai.s@student.mfu.ac.th',
      role: 'student',
      department: 'School of Applied Digital Technology (ADT)',
      isActive: true,
      hasAiAccess: false,
      createdAt: '2024-06-01',
    }

    renderWithProviders(<StudentVoiceSurvey />, { route: '/student/voice?return=/student/request?category=withdrawal_leave' })

    // Verify completion notification banner exists with return button
    expect(screen.getAllByText(/คุณได้ทำแบบสำรวจเสียงของนักศึกษาเรียบร้อยแล้ว/i)[0]).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ดำเนินการยื่นคำร้องต่อ/i })).toBeInTheDocument()
  })

  it('does NOT enforce Student Voice for other advising categories in RequestAdvising', () => {
    mockUser = { ...studentUser }
    renderWithProviders(<RequestAdvising />, { route: '/student/request' })

    // Select general category e.g. Academic Performance
    const categorySelect = screen.getByRole('combobox')
    act(() => {
      fireEvent.change(categorySelect, { target: { value: 'academic_performance' } })
    })

    // Student Voice card and advisory warning should NOT be present
    expect(screen.queryByText(/จำเป็นต้องทำก่อนส่งคำร้อง/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/คำแนะนำก่อนยื่นขอลาพัก \/ ขอลาออก \/ ย้ายสาขาวิชา/i)).not.toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /ยืนยันส่งคำร้อง/i })
    expect(submitBtn).not.toBeDisabled()
  })
})

