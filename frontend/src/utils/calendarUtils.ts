// ============================================================
// Google Calendar Utility
// ============================================================

export interface GoogleCalendarEventOptions {
  title: string
  description?: string
  location?: string
  date?: string // e.g. "2026-10-15"
  time?: string // e.g. "10:00" or "10:00 - 11:00" or "10:00:00"
  startTime?: string | Date // ISO string or Date
  endTime?: string | Date // ISO string or Date
  durationMinutes?: number // Default: 45
  attendeeEmails?: string[]
}

/**
 * Format a Date object into Google Calendar URL date format (UTC: YYYYMMDDTHHmmssZ)
 */
export function formatGoogleCalendarDate(date: Date): string {
  return date
    .toISOString()
    .replace(/-|:|\.\d\d\d/g, '')
}

/**
 * Parse combined date string and time string into start and end Date objects
 */
export function parseMeetingDateTime(
  dateStr?: string,
  timeStr?: string,
  durationMinutes = 45
): { startDate: Date; endDate: Date } {
  const now = new Date()
  
  // If no date is given, default to tomorrow at 10:00 AM
  if (!dateStr) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(10, 0, 0, 0)
    const end = new Date(tomorrow.getTime() + durationMinutes * 60 * 1000)
    return { startDate: tomorrow, endDate: end }
  }

  // Parse time (e.g., "10:00", "14:30", "10:00 - 11:00", "09:00 AM")
  let hours = 10
  let minutes = 0
  let endHours: number | null = null
  let endMinutes: number | null = null

  if (timeStr) {
    const cleaned = timeStr.trim()
    const rangeMatch = cleaned.match(/(\d{1,2})[:.](\d{2})\s*(?:-|to)\s*(\d{1,2})[:.](\d{2})/i)
    if (rangeMatch) {
      hours = parseInt(rangeMatch[1], 10)
      minutes = parseInt(rangeMatch[2], 10)
      endHours = parseInt(rangeMatch[3], 10)
      endMinutes = parseInt(rangeMatch[4], 10)
    } else {
      const singleMatch = cleaned.match(/(\d{1,2})[:.](\d{2})/i)
      if (singleMatch) {
        hours = parseInt(singleMatch[1], 10)
        minutes = parseInt(singleMatch[2], 10)
        if (cleaned.toLowerCase().includes('pm') && hours < 12) hours += 12
        if (cleaned.toLowerCase().includes('am') && hours === 12) hours = 0
      }
    }
  }

  // Create start date
  const [year, month, day] = dateStr.split('-').map(Number)
  const startDate = new Date(year, (month || 1) - 1, day || 1, hours, minutes, 0, 0)

  // Create end date
  let endDate: Date
  if (endHours !== null && endMinutes !== null) {
    endDate = new Date(year, (month || 1) - 1, day || 1, endHours, endMinutes, 0, 0)
  } else {
    endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000)
  }

  return { startDate, endDate }
}

/**
 * Builds a 1-click Google Calendar Event Creation URL
 */
export function buildGoogleCalendarUrl(options: GoogleCalendarEventOptions): string {
  const {
    title,
    description = '',
    location = '',
    date,
    time,
    startTime,
    endTime,
    durationMinutes = 45,
    attendeeEmails = [],
  } = options

  let start: Date
  let end: Date

  if (startTime) {
    start = typeof startTime === 'string' ? new Date(startTime) : startTime
    if (endTime) {
      end = typeof endTime === 'string' ? new Date(endTime) : endTime
    } else {
      end = new Date(start.getTime() + durationMinutes * 60 * 1000)
    }
  } else {
    const parsed = parseMeetingDateTime(date, time, durationMinutes)
    start = parsed.startDate
    end = parsed.endDate
  }

  // Guard against invalid dates
  if (isNaN(start.getTime())) start = new Date()
  if (isNaN(end.getTime())) end = new Date(start.getTime() + durationMinutes * 60 * 1000)

  const dateParam = `${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(end)}`

  const params = new URLSearchParams()
  params.set('action', 'TEMPLATE')
  params.set('text', title)
  params.set('dates', dateParam)

  if (description.trim()) {
    params.set('details', description.trim())
  }

  if (location.trim()) {
    params.set('location', location.trim())
  }

  // Filter valid emails and deduplicate
  const validEmails = Array.from(
    new Set(
      attendeeEmails
        .map(e => e.trim())
        .filter(e => e && e.includes('@'))
    )
  )

  if (validEmails.length > 0) {
    params.set('add', validEmails.join(','))
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Opens Google Calendar event creation directly in a new browser tab
 */
export function openGoogleCalendarEvent(options: GoogleCalendarEventOptions): void {
  const url = buildGoogleCalendarUrl(options)
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Builds direct Google Calendar URL to view an advisor's availability / schedule
 * Uses embed mode to directly show a clean weekly schedule view without forcing a "Subscribe/Add Calendar" prompt.
 */
export function buildAdvisorCalendarUrl(advisorEmail?: string): string {
  if (!advisorEmail || !advisorEmail.includes('@')) {
    return 'https://calendar.google.com/calendar/r'
  }
  return `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(advisorEmail.trim())}&mode=WEEK&ctz=Asia%2FBangkok&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&showTz=0`
}

/**
 * Opens advisor's Google Calendar directly in a new tab
 */
export function openAdvisorCalendar(advisorEmail?: string): void {
  const url = buildAdvisorCalendarUrl(advisorEmail)
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
