import { describe, it, expect } from 'vitest'
import { isReadyToClose, allFollowUpsDone, meetingHasPassed, checkInAppointment, needsNotes } from './requestFlow'
import type { AdvisingRequest, AdvisingSession, Appointment, FollowUp } from '@/types'

const req = (status: AdvisingRequest['status']) => ({ id: 'REQ1', status } as AdvisingRequest)
const session = { id: 'S1', requestId: 'REQ1' } as AdvisingSession
const fu = (id: string, status: FollowUp['status']) => ({ id, requestId: 'REQ1', status } as FollowUp)

describe('isReadyToClose', () => {
  it('needs a completed request with meeting notes and no open tasks', () => {
    expect(isReadyToClose(req('completed'), [session], [fu('F1', 'completed')])).toBe(true)
    expect(isReadyToClose(req('completed'), [session], [])).toBe(true)
  })

  it('is not ready while a task is open, notes are missing, or the case is not completed', () => {
    expect(isReadyToClose(req('completed'), [session], [fu('F1', 'completed'), fu('F2', 'pending')])).toBe(false)
    expect(isReadyToClose(req('completed'), [], [])).toBe(false)
    expect(isReadyToClose(req('scheduled'), [session], [])).toBe(false)
    expect(isReadyToClose(req('closed'), [session], [])).toBe(false)
  })
})

describe('allFollowUpsDone', () => {
  it('is true only when the request has tasks and all are completed', () => {
    expect(allFollowUpsDone('REQ1', [fu('F1', 'completed'), fu('F2', 'completed')])).toBe(true)
    expect(allFollowUpsDone('REQ1', [fu('F1', 'completed'), fu('F2', 'in_progress')])).toBe(false)
    expect(allFollowUpsDone('REQ1', [])).toBe(false)
  })
})

describe('meeting check-in', () => {
  const now = new Date(2026, 10, 6, 10, 0) // 6 Nov 2026, 10:00 local
  const apt = (time: string, extra: Partial<Appointment> = {}) =>
    ({ id: 'A1', requestId: 'REQ1', scheduledDate: '2026-11-06', scheduledTime: time, status: 'scheduled', studentConfirmed: true, studentDeclined: false, ...extra } as Appointment)

  it('knows when the meeting time has passed (local time)', () => {
    expect(meetingHasPassed(apt('09:30'), now)).toBe(true)
    expect(meetingHasPassed(apt('10:30'), now)).toBe(false)
  })

  it('asks the student only after the time, for an accepted, still-scheduled meeting', () => {
    expect(checkInAppointment(req('scheduled'), [apt('09:30')], now)?.id).toBe('A1')
    expect(checkInAppointment(req('scheduled'), [apt('10:30')], now)).toBeNull()
    expect(checkInAppointment(req('scheduled'), [apt('09:30', { studentConfirmed: false })], now)).toBeNull()
    expect(checkInAppointment(req('completed'), [apt('09:30')], now)).toBeNull()
  })

  it('lists meetings needing notes until notes exist, including forgotten past meetings', () => {
    expect(needsNotes(req('completed'), [], [], now)).toBe(true)
    expect(needsNotes(req('scheduled'), [], [apt('09:30')], now)).toBe(true) // nobody pressed Complete
    expect(needsNotes(req('scheduled'), [], [apt('10:30')], now)).toBe(false) // not yet
    expect(needsNotes(req('completed'), [session], [], now)).toBe(false) // notes written
  })
})
