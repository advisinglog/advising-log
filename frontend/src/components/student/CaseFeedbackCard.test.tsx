import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/data/store'
import { ToastProvider } from '@/contexts/ToastContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { CaseFeedbackCard } from './CaseFeedbackCard'
import type { AdvisingRequest } from '@/types'

const closed = { id: 'REQ_T1', status: 'closed', closedAt: '2026-11-06T09:00:00.000Z' } as AdvisingRequest

function renderCard(request: AdvisingRequest) {
  return render(
    <MemoryRouter>
      <ThemeProvider><LanguageProvider><StoreProvider><ToastProvider>
        <CaseFeedbackCard request={request} />
      </ToastProvider></StoreProvider></LanguageProvider></ThemeProvider>
    </MemoryRouter>
  )
}

describe('CaseFeedbackCard', () => {
  beforeEach(() => localStorage.clear())

  it('asks for an optional rating; sending is disabled until a star is picked', () => {
    renderCard(closed)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    const send = screen.getByRole('button', { name: /ส่งความคิดเห็น|Send Feedback/i })
    expect(send).toBeDisabled()
    act(() => { fireEvent.click(screen.getAllByRole('radio')[3]) })
    expect(send).not.toBeDisabled()
  })

  it('can be skipped without blocking anything, and stays skipped on this device', () => {
    const { unmount } = renderCard(closed)
    act(() => { fireEvent.click(screen.getByRole('button', { name: /ข้าม|Skip/i })) })
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    unmount()
    renderCard(closed)
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
  })

  it('shows the given rating instead of the question once rated', () => {
    renderCard({ ...closed, satisfactionRating: 4 })
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.getByLabelText('4/5')).toBeInTheDocument()
  })
})
