import { describe, it, expect } from 'vitest'
import { isReadyToClose, allFollowUpsDone } from './requestFlow'
import type { AdvisingRequest, AdvisingSession, FollowUp } from '@/types'

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
