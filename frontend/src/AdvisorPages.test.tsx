import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/data/mock-store'
import { ToastProvider } from '@/contexts/ToastContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import AdvisorDashboard from '@/pages/advisor/AdvisorDashboard'
import AdvisingSessions from '@/pages/advisor/AdvisingSessions'
import ExitCases from '@/pages/advisor/ExitCases'
import AdvisorLog from '@/pages/advisor/AdvisorLog'
import EarlyWarning from '@/pages/advisor/EarlyWarning'
import Referrals from '@/pages/advisor/Referrals'

// Mock currentUser as Advisor
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/AuthContext')>('@/contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      currentUser: {
        id: 'ADV001',
        code: 'A001',
        name: 'Dr. Prasit Kanchanawat',
        email: 'prasit@mfu.ac.th',
        role: 'advisor',
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        createdAt: '2024-01-01',
      },
      isAuthenticated: true,
    }),
  }
})

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <StoreProvider>
              {ui}
            </StoreProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('Advisor Pages Audit & Resilience Tests', () => {
  it('renders AdvisorDashboard with cohort stats and upcoming appointments without crashing', () => {
    renderWithProviders(<AdvisorDashboard />)
    expect(screen.getByText(/ระบบบริหารการให้คำปรึกษาทางวิชาการ|Advisor Academic Console/i)).toBeInTheDocument()
    expect(screen.getByText(/เพิ่มนักศึกษาในความดูแล|Add Advisee/i)).toBeInTheDocument()
  })

  it('renders AdvisingSessions and renders requests table safely', () => {
    renderWithProviders(<AdvisingSessions />)
    expect(screen.getByText(/ตารางนัดหมายและการเข้าพบ|รายการการให้คำปรึกษาทางวิชาการ|Appointments & Advising Sessions|Advising Sessions/i)).toBeInTheDocument()

    // Table should render student requests
    expect(screen.getByText(/หมวดหมู่|Category/i)).toBeInTheDocument()
    expect(screen.getByText(/วันและเวลานัดหมาย|Meeting Time/i)).toBeInTheDocument()
  })

  it('renders ExitCases and opens case detail modal safely without throwing on timeline items', () => {
    renderWithProviders(<ExitCases />)
    expect(screen.getByText(/รายการเคสขอลาออก \/ ลาพักการศึกษา|Exit & Dropout Cases/i)).toBeInTheDocument()

    // Look for view case buttons if any exist
    const viewButtons = screen.queryAllByRole('button', { name: /ดูรายละเอียด|View/i })
    if (viewButtons.length > 0) {
      fireEvent.click(viewButtons[0])
      expect(screen.getByText(/รายละเอียดคำร้องขอลาออก \/ ลาพัก|Exit Case Details/i)).toBeInTheDocument()
    }
  })

  it('renders AdvisorLog entry form correctly', () => {
    renderWithProviders(<AdvisorLog />)
    expect(screen.getByText(/บันทึกผลการเข้าพบอาจารย์ที่ปรึกษา|Advisor Log Entry/i)).toBeInTheDocument()
  })

  it('renders EarlyWarning risk cases table', () => {
    renderWithProviders(<EarlyWarning />)
    expect(screen.getByText(/ระบบเตือนภัยวิชาการนักศึกษา|Student Early Warning System/i)).toBeInTheDocument()
  })

  it('renders Referrals table and creation button', () => {
    renderWithProviders(<Referrals />)
    expect(screen.getByText(/การส่งต่อหน่วยงาน|Referrals/i)).toBeInTheDocument()
  })

  it('allows opening referral modal and shows student options', () => {
    renderWithProviders(<Referrals />)
    const createBtn = screen.getByRole('button', { name: /สร้างการส่งต่อใหม่|Create Referral/i })
    fireEvent.click(createBtn)

    expect(screen.getByText(/ส่งต่อนักศึกษาไปยังหน่วยงานสนับสนุน|Create Student Support Referral/i)).toBeInTheDocument()
    expect(screen.getByText(/เลือกนักศึกษาในความดูแล|Select Advisee/i)).toBeInTheDocument()
    expect(screen.getByText(/หน่วยงานปลายทาง|Target Department/i)).toBeInTheDocument()
  })

  it('renders advisor schedule calendar when clicking Accept on a pending request', () => {
    renderWithProviders(<AdvisingSessions />)

    // Find and click Accept button on pending request table
    const acceptBtns = screen.queryAllByRole('button', { name: /ตอบรับการนัด|Accept/i })
    expect(acceptBtns.length).toBeGreaterThan(0)
    fireEvent.click(acceptBtns[0])

    // Should open Confirm Appointment Modal with AdvisorScheduleCalendar embedded
    expect(screen.getByText(/ตอบรับและยืนยันการนัดหมายเข้าพบอาจารย์ที่ปรึกษา|Accept & Confirm Advising Appointment/i)).toBeInTheDocument()
    expect(screen.getByText(/ปฏิทินตารางเวลาของอาจารย์|Advisor Schedule & Availability/i)).toBeInTheDocument()
    expect(screen.getByText(/ตารางนัดหมายของท่านประจำวันที่|Advisor Appointments for/i)).toBeInTheDocument()
    expect(screen.queryByText(/ช่วงเวลาแนะนำ|Quick Time Slots/i)).toBeNull()
  })

  it('allows opening standalone advisor schedule calendar modal from header button', () => {
    renderWithProviders(<AdvisingSessions />)

    const viewCalBtn = screen.getByRole('button', { name: /ดูปฏิทินตารางนัดหมายของฉัน|View My Schedule Calendar/i })
    expect(viewCalBtn).toBeInTheDocument()
    fireEvent.click(viewCalBtn)

    expect(screen.getByText(/ปฏิทินตารางนัดหมายและการให้คำปรึกษาของอาจารย์|Advisor Advising & Appointment Calendar/i)).toBeInTheDocument()
  })

  it('allows advisor to switch to Google Calendar view to check availability when confirming appointment', () => {
    renderWithProviders(<AdvisingSessions />)

    const acceptBtns = screen.queryAllByRole('button', { name: /ตอบรับการนัด|Accept/i })
    expect(acceptBtns.length).toBeGreaterThan(0)
    fireEvent.click(acceptBtns[0])

    // Find Google Calendar tab button inside modal
    const gCalTabBtns = screen.getAllByRole('button', { name: /Google Calendar/i })
    expect(gCalTabBtns.length).toBeGreaterThan(0)
    fireEvent.click(gCalTabBtns[0])

    // Should display Advisor Google Calendar view with account info and quick slot selection
    expect(screen.getByText(/Google Calendar ของอาจารย์|Advisor Google Calendar/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /เปิดเต็มจอ|Open Full Tab/i })).toBeInTheDocument()
    expect(screen.getByTitle('Advisor Google Calendar')).toBeInTheDocument()
  })

  it('shows Google Calendar availability check button in request details modal', () => {
    renderWithProviders(<AdvisingSessions />)

    // Click on pending request student or details to open detail modal
    const cell = screen.getByText(/Nattapong Wongchai|I have been feeling overwhelmed/i)
    fireEvent.click(cell)

    // Verify detail modal contains Google Calendar check button
    expect(screen.getByText(/รายละเอียดคำร้องขอคำปรึกษา|Advising Request Details/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /เช็คตารางใน Google Calendar|Check Google Calendar/i })).toBeInTheDocument()
  })
})
