import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '@/contexts/ToastContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import api from '@/services/apiClient'
import Feedback from './Feedback'
import { AnonymousFeedbackPanel } from '@/components/qa/AnonymousFeedbackPanel'

function wrap(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <ThemeProvider><LanguageProvider><ToastProvider>{ui}</ToastProvider></LanguageProvider></ThemeProvider>
    </MemoryRouter>
  )
}

afterEach(() => vi.restoreAllMocks())

describe('Anonymous feedback', () => {
  it('needs a topic and a message, then sends without any student identity', async () => {
    const submit = vi.spyOn(api, 'submitFeedback').mockResolvedValue({ success: true })
    wrap(<Feedback />)

    const send = screen.getByRole('button', { name: /ส่งแบบไม่ระบุตัวตน|Send anonymously/i })
    expect(send).toBeDisabled()

    act(() => { fireEvent.click(screen.getByRole('radio', { name: /ปัญหาการใช้งานระบบ|App problem/i })) })
    expect(send).toBeDisabled()
    act(() => { fireEvent.change(screen.getByLabelText(/รายละเอียด|Your message/i), { target: { value: '  Page is blank  ' } }) })
    expect(send).not.toBeDisabled()

    await act(async () => { fireEvent.click(send) })
    expect(submit).toHaveBeenCalledWith({ topic: 'app_bug', rating: undefined, message: 'Page is blank' })
    expect(screen.getByText(/ส่งเรียบร้อยแล้ว|Sent\. Thank you/i)).toBeInTheDocument()
  })

  it('keeps the form when sending fails', async () => {
    vi.spyOn(api, 'submitFeedback').mockResolvedValue(null)
    wrap(<Feedback />)
    act(() => { fireEvent.click(screen.getByRole('radio', { name: /อื่นๆ|Other/i })) })
    act(() => { fireEvent.change(screen.getByLabelText(/รายละเอียด|Your message/i), { target: { value: 'hello' } }) })
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /ส่งแบบไม่ระบุตัวตน|Send anonymously/i })) })
    expect(screen.queryByText(/ส่งเรียบร้อยแล้ว|Sent\. Thank you/i)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/รายละเอียด|Your message/i)).toHaveValue('hello')
  })

  it('QA panel lists entries and filters by topic', async () => {
    vi.spyOn(api, 'getFeedback').mockResolvedValue({
      feedback: [
        { id: 'a', topic: 'app_bug', rating: 2, message: 'Login loops', createdAt: '2026-11-06' },
        { id: 'b', topic: 'advising', rating: null, message: 'Great advisor', createdAt: '2026-11-05' },
      ],
    })
    await act(async () => { wrap(<AnonymousFeedbackPanel />) })
    expect(screen.getByText('Login loops')).toBeInTheDocument()
    expect(screen.getByText('Great advisor')).toBeInTheDocument()

    act(() => { fireEvent.click(screen.getByRole('button', { name: /ปัญหาการใช้งานระบบ|App problem/i })) })
    expect(screen.getByText('Login loops')).toBeInTheDocument()
    expect(screen.queryByText('Great advisor')).not.toBeInTheDocument()
  })
})
