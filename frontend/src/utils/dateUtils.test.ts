import { describe, it, expect } from 'vitest'
import { getLocalDateString } from './dateUtils'

describe('dateUtils', () => {
  it('formats specific local date correctly with padding', () => {
    const specificDate = new Date(2026, 0, 5, 2, 30, 0) // Jan 5, 2026, 02:30 AM local
    expect(getLocalDateString(specificDate)).toBe('2026-01-05')
  })

  it('formats double digit month and day correctly', () => {
    const specificDate = new Date(2026, 11, 25, 23, 45, 0) // Dec 25, 2026, 11:45 PM local
    expect(getLocalDateString(specificDate)).toBe('2026-12-25')
  })

  it('returns valid YYYY-MM-DD pattern for default current time', () => {
    const result = getLocalDateString()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
