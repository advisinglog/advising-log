import { describe, it, expect } from 'vitest'
import { getLocalDateString, getLocalTimestamp } from './dateUtils'

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

describe('getLocalTimestamp', () => {
  it('starts with the local date and includes time and UTC offset', () => {
    const d = new Date(2026, 10, 6, 13, 5, 22, 123)
    const ts = getLocalTimestamp(d)
    expect(ts.slice(0, 10)).toBe(getLocalDateString(d))
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T13:05:22\.123[+-]\d{2}:\d{2}$/)
  })

  it('sorts same-day requests newest-first, after older date-only values', () => {
    const morning = getLocalTimestamp(new Date(2026, 10, 6, 9, 0))
    const afternoon = getLocalTimestamp(new Date(2026, 10, 6, 15, 30))
    const sorted = ['2026-11-06', morning, afternoon, '2026-11-05'].sort((a, b) => b.localeCompare(a))
    expect(sorted).toEqual([afternoon, morning, '2026-11-06', '2026-11-05'])
  })
})
