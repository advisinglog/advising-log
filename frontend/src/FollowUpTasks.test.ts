import { describe, it, expect } from 'vitest'
import { draftsProblem, filledDrafts } from '@/components/advisor/FollowUpTasks'

describe('follow-up task drafts', () => {
  it('ignores rows left completely empty', () => {
    const rows = [{ task: 'Submit form', dueDate: '2026-12-01' }, { task: '', dueDate: '' }]
    expect(filledDrafts(rows)).toHaveLength(1)
    expect(draftsProblem(rows)).toBeNull()
  })

  it('flags a task without a due date', () => {
    expect(draftsProblem([{ task: 'Submit form', dueDate: '' }])).toBe('missing_date')
  })

  it('flags a due date without a task', () => {
    expect(draftsProblem([{ task: '  ', dueDate: '2026-12-01' }])).toBe('missing_task')
  })

  it('accepts several complete tasks', () => {
    const rows = [
      { task: 'Submit form', dueDate: '2026-12-01' },
      { task: 'Meet counselor', dueDate: '2026-12-05' },
    ]
    expect(filledDrafts(rows)).toHaveLength(2)
    expect(draftsProblem(rows)).toBeNull()
  })
})
