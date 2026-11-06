import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider, useStore } from '@/data/store'
import { ToastProvider } from '@/contexts/ToastContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import api from '@/services/apiClient'
import { MeetingCheckIn } from './MeetingCheckIn'
import type { AdvisingRequest, Appointment } from '@/types'

const request = { id: 'REQ001', studentId: 'STU001', advisorId: 'ADV001', category: 'academic_performance', status: 'scheduled' } as AdvisingRequest
const appointment = { id: 'APT001', requestId: 'REQ001', scheduledDate: '2026-09-10', scheduledTime: '10:00', status: 'scheduled', studentConfirmed: true } as Appointment

let storeRef: ReturnType<typeof useStore>
function Probe() { storeRef = useStore(); return null }

function renderCard() {
  return render(
    <MemoryRouter>
      <ThemeProvider><LanguageProvider><StoreProvider><ToastProvider>
        <Probe />
        <MeetingCheckIn request={request} appointment={appointment} />
      </ToastProvider></StoreProvider></LanguageProvider></ThemeProvider>
    </MemoryRouter>
  )
}

afterEach(() => vi.restoreAllMocks())

describe('MeetingCheckIn', () => {
  it('"we met" completes the meeting and tells the advisor to write notes', async () => {
    const statusSpy = vi.spyOn(api, 'updateRequestStatus').mockResolvedValue({ success: true })
    renderCard()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /เข้าพบแล้ว|Yes, we met/i })) })
    expect(statusSpy).toHaveBeenCalledWith('REQ001', 'completed')
    expect(storeRef.requests.find(r => r.id === 'REQ001')?.status).toBe('completed')
    expect(storeRef.notifications.some(n => n.userId === 'ADV001' && n.relatedId === 'REQ001' && n.type === 'action_required')).toBe(true)
  })

  it("'didn't happen' sends the request back to the advisor to reschedule", async () => {
    const statusSpy = vi.spyOn(api, 'updateRequestStatus').mockResolvedValue({ success: true })
    renderCard()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /ไม่ได้เข้าพบ|didn/i })) })
    expect(statusSpy).toHaveBeenCalledWith('REQ001', 'requested')
    expect(storeRef.requests.find(r => r.id === 'REQ001')?.status).toBe('requested')
  })

  it('changes nothing when the server refuses', async () => {
    vi.spyOn(api, 'updateRequestStatus').mockResolvedValue(null)
    renderCard()
    const before = storeRef.requests.find(r => r.id === 'REQ001')?.status
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /เข้าพบแล้ว|Yes, we met/i })) })
    expect(storeRef.requests.find(r => r.id === 'REQ001')?.status).toBe(before)
  })
})
