import { describe, it, expect } from 'vitest'
import {
  buildGoogleCalendarUrl,
  parseMeetingDateTime,
  formatGoogleCalendarDate,
  buildAdvisorCalendarUrl,
} from './calendarUtils'

describe('calendarUtils', () => {
  it('formats dates in Google Calendar UTC format', () => {
    const testDate = new Date('2026-10-15T10:00:00.000Z')
    const formatted = formatGoogleCalendarDate(testDate)
    expect(formatted).toBe('20261015T100000Z')
  })

  it('parses date and time string correctly', () => {
    const { startDate, endDate } = parseMeetingDateTime('2026-10-15', '14:00', 60)
    expect(startDate.getFullYear()).toBe(2026)
    expect(startDate.getMonth()).toBe(9) // 0-indexed October
    expect(startDate.getDate()).toBe(15)
    expect(startDate.getHours()).toBe(14)
    expect(startDate.getMinutes()).toBe(0)
    expect(endDate.getHours()).toBe(15)
  })

  it('parses time range string (e.g. 10:00 - 11:30)', () => {
    const { startDate, endDate } = parseMeetingDateTime('2026-10-15', '10:00 - 11:30')
    expect(startDate.getHours()).toBe(10)
    expect(startDate.getMinutes()).toBe(0)
    expect(endDate.getHours()).toBe(11)
    expect(endDate.getMinutes()).toBe(30)
  })

  it('builds a valid Google Calendar URL with attendees and location', () => {
    const url = buildGoogleCalendarUrl({
      title: 'Advising Meeting: Somchai & Dr. Smith',
      description: 'Discussing Academic Progress',
      location: 'Faculty Office E2-304',
      date: '2026-10-15',
      time: '10:00',
      durationMinutes: 45,
      attendeeEmails: ['somchai@student.cmu.ac.th', 'smith@cmu.ac.th', 'invalid-email'],
    })

    expect(url).toContain('https://calendar.google.com/calendar/render')
    expect(url).toContain('action=TEMPLATE')
    expect(url).toContain('text=Advising+Meeting%3A+Somchai+%26+Dr.+Smith')
    expect(url).toContain('details=Discussing+Academic+Progress')
    expect(url).toContain('location=Faculty+Office+E2-304')
    expect(url).toContain('add=somchai%40student.cmu.ac.th%2Csmith%40cmu.ac.th')
    // invalid-email should be filtered out
    expect(url).not.toContain('invalid-email')
  })

  it('builds clean Google Calendar embed URL for advisor calendar viewer', () => {
    const url = buildAdvisorCalendarUrl('advisor@mfu.ac.th')
    expect(url).toContain('https://calendar.google.com/calendar/embed')
    expect(url).toContain('src=advisor%40mfu.ac.th')
    expect(url).toContain('mode=WEEK')

    const fallbackUrl = buildAdvisorCalendarUrl('')
    expect(fallbackUrl).toBe('https://calendar.google.com/calendar/r')
  })
})
