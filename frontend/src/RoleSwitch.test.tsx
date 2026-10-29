import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TopBar } from '@/components/layout/TopBar'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { StoreProvider } from '@/data/mock-store'
import { ToastProvider } from '@/contexts/ToastContext'
import { getAvailableRolesForUser, getRoleDefaultPath } from '@/utils/roleUtils'
import type { User } from '@/types'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

let mockAuthUser: User | null = null
const mockSwitchRole = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: mockAuthUser,
    isAuthenticated: Boolean(mockAuthUser),
    login: vi.fn(),
    logout: mockLogout,
    switchRole: mockSwitchRole,
  }),
}))

describe('Role Switcher & Multi-Role Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('getAvailableRolesForUser & getRoleDefaultPath', () => {
    it('allows Advisor to switch between Advisor and QA Chair', () => {
      const advisorUser: User = {
        id: 'ADV001',
        code: 'EMP-1001',
        name: 'Dr. Prasit Kanchanawat',
        email: 'prasit.k@mfu.ac.th',
        role: 'advisor',
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        createdAt: '2024-01-01',
      }
      const roles = getAvailableRolesForUser(advisorUser)
      expect(roles).toEqual(['advisor', 'qa_chair'])
    })

    it('allows QA Chair to switch between QA Chair and Advisor', () => {
      const qaUser: User = {
        id: 'QA001',
        code: 'EMP-2001',
        name: 'Assoc. Prof. Rattana Pongsakorn',
        email: 'rattana.p@mfu.ac.th',
        role: 'qa_chair',
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        createdAt: '2024-01-01',
      }
      const roles = getAvailableRolesForUser(qaUser)
      expect(roles).toEqual(['advisor', 'qa_chair'])
    })

    it('restricts Student to only student role without role switching', () => {
      const studentUser: User = {
        id: 'STU001',
        code: '6631503001',
        name: 'Somchai Jaidee',
        email: 'somchai.j@student.mfu.ac.th',
        role: 'student',
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        createdAt: '2024-01-01',
      }
      const roles = getAvailableRolesForUser(studentUser)
      expect(roles).toEqual(['student'])
    })

    it('maps default paths correctly for each role', () => {
      expect(getRoleDefaultPath('advisor')).toBe('/advisor')
      expect(getRoleDefaultPath('qa_chair')).toBe('/qa')
      expect(getRoleDefaultPath('admin')).toBe('/admin')
      expect(getRoleDefaultPath('super_admin')).toBe('/admin')
      expect(getRoleDefaultPath('student')).toBe('/student')
    })
  })

  describe('TopBar Profile Dropdown Interaction', () => {
    function renderTopBar() {
      return render(
        <MemoryRouter>
          <ThemeProvider>
            <LanguageProvider>
              <StoreProvider>
                <ToastProvider>
                  <TopBar onMenuClick={vi.fn()} />
                </ToastProvider>
              </StoreProvider>
            </LanguageProvider>
          </ThemeProvider>
        </MemoryRouter>
      )
    }

    it('renders role switcher options when an Advisor clicks their profile', () => {
      mockAuthUser = {
        id: 'ADV001',
        code: 'EMP-1001',
        name: 'Dr. Prasit Kanchanawat',
        email: 'prasit.k@mfu.ac.th',
        role: 'advisor',
        baseRole: 'advisor',
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        createdAt: '2024-01-01',
      }

      renderTopBar()

      // Look for the profile button trigger
      const profileTrigger = screen.getByTitle(/โปรไฟล์และการสลับบทบาท|Profile & Role Switcher/i)
      expect(profileTrigger).toBeDefined()
      expect(screen.getAllByText('Dr. Prasit Kanchanawat').length).toBeGreaterThanOrEqual(1)

      // Click to open profile dropdown
      fireEvent.click(profileTrigger)

      // Dropdown should show Switch Role section
      expect(screen.getByText(/สลับบทบาทการทำงาน|Switch Role Workspace/i)).toBeDefined()
      expect(screen.getByText(/ประธานหลักสูตร \/ QA|Program Chair/i)).toBeDefined()

      // Click on QA Chair role option to switch
      const qaOption = screen.getByText(/ประธานหลักสูตร \/ QA|Program Chair/i).closest('button')
      expect(qaOption).toBeDefined()
      fireEvent.click(qaOption!)

      // Assert switchRole and navigate to /qa were called
      expect(mockSwitchRole).toHaveBeenCalledWith('qa_chair')
      expect(mockNavigate).toHaveBeenCalledWith('/qa')
    })

    it('does NOT render role switcher section when Student clicks profile', () => {
      mockAuthUser = {
        id: 'STU001',
        code: '6631503001',
        name: 'Somchai Jaidee',
        email: 'somchai.j@student.mfu.ac.th',
        role: 'student',
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        createdAt: '2024-01-01',
      }

      renderTopBar()

      const profileTrigger = screen.getByTitle(/โปรไฟล์และการสลับบทบาท|Profile & Role Switcher/i)
      fireEvent.click(profileTrigger)

      // Student identity should be visible
      expect(screen.getAllByText('Somchai Jaidee').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/6631503001/)).toBeDefined()

      // Switch Role workspace section should NOT exist for student
      expect(screen.queryByText(/สลับบทบาทการทำงาน|Switch Role Workspace/i)).toBeNull()
    })

    it('allows logging out from the dropdown', () => {
      mockAuthUser = {
        id: 'ADV001',
        code: 'EMP-1001',
        name: 'Dr. Prasit Kanchanawat',
        email: 'prasit.k@mfu.ac.th',
        role: 'advisor',
        department: 'School of Applied Digital Technology (ADT)',
        isActive: true,
        createdAt: '2024-01-01',
      }

      renderTopBar()

      const profileTrigger = screen.getByTitle(/โปรไฟล์และการสลับบทบาท|Profile & Role Switcher/i)
      fireEvent.click(profileTrigger)

      const logoutBtn = screen.getByText(/ออกจากระบบ|Sign out/i).closest('button')
      expect(logoutBtn).toBeDefined()
      fireEvent.click(logoutBtn!)

      expect(mockLogout).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})

