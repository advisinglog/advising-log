import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/data/mock-store'
import { ToastProvider } from '@/contexts/ToastContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import FollowUps from '@/pages/student/FollowUps'

// Mock currentUser as Student STU007 (has follow up FU004 in mock data)
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/AuthContext')>('@/contexts/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      currentUser: {
        id: 'STU007',
        code: '6631503007',
        name: 'Supaporn Promdee',
        email: 'supaporn.p@lamduan.mfu.ac.th',
        role: 'student',
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

describe('Student FollowUps Component', () => {
  it('renders student follow-up tasks and progress', () => {
    renderWithProviders(<FollowUps />)
    expect(screen.getByText(/งานที่ต้องดำเนินการ|Assigned Follow-ups/i)).toBeInTheDocument()
  })

  it('allows opening progress modal and preloads current progress', () => {
    renderWithProviders(<FollowUps />)
    const updateButtons = screen.getAllByRole('button', { name: /อัปเดต|Update/i })
    expect(updateButtons.length).toBeGreaterThan(0)

    fireEvent.click(updateButtons[0])
    expect(screen.getByText(/อัปเดตความคืบหน้า|Update Progress/i)).toBeInTheDocument()
    expect(screen.getByText(/ความคืบหน้า \(%\)|Progress \(%\)/i)).toBeInTheDocument()
  })

  it('updates progress and notes when submitted', () => {
    renderWithProviders(<FollowUps />)
    const updateButtons = screen.getAllByRole('button', { name: /อัปเดต|Update/i })
    fireEvent.click(updateButtons[0])

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '75' } })

    const textarea = screen.getByPlaceholderText(/บันทึกสิ่งที่ทำไป|Record what you have done/i)
    fireEvent.change(textarea, { target: { value: 'Made good progress with advisor.' } })

    const saveBtn = screen.getByRole('button', { name: /^บันทึก$|^Save$/i })
    fireEvent.click(saveBtn)

    // Modal should close
    expect(screen.queryByText(/ความคืบหน้า \(%\)|Progress \(%\)/i)).not.toBeInTheDocument()
  })

  it('marks task completed when Complete button is clicked', () => {
    renderWithProviders(<FollowUps />)
    const completeBtns = screen.getAllByRole('button', { name: /เสร็จแล้ว|Complete/i })
    expect(completeBtns.length).toBeGreaterThan(0)

    fireEvent.click(completeBtns[0])
    expect(screen.getByText(/เสร็จสิ้น|Completed/i)).toBeInTheDocument()
  })
})
