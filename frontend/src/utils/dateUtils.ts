/**
 * Format a Date object (defaulting to current local time) to 'YYYY-MM-DD' string
 * using local timezone instead of UTC to avoid early morning date rollback bugs (e.g. UTC+7).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Full local timestamp with UTC offset, e.g. '2026-11-06T13:05:22.123+07:00'.
 * Sorts correctly as a string and its first 10 chars are the local date,
 * so `.slice(0, 10)` matches getLocalDateString(). Older date-only values sort before it.
 */
export function getLocalTimestamp(date: Date = new Date()): string {
  const pad = (n: number, len = 2) => String(Math.abs(n)).padStart(len, '0')
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
  return `${getLocalDateString(date)}T${time}${sign}${pad(Math.trunc(offsetMinutes / 60))}:${pad(offsetMinutes % 60)}`
}

/**
 * Milliseconds for sorting a date or timestamp string ('2026-11-15' or a full ISO timestamp).
 * Missing or unparseable values sort last when ordering newest-first.
 */
export function toSortTime(value?: string | null): number {
  if (!value) return 0
  const ms = Date.parse(value)
  return Number.isNaN(ms) ? 0 : ms
}

/**
 * Shows a date-only value as-is, and a full timestamp as local 'YYYY-MM-DD HH:mm'.
 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  if (value.length <= 10) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${getLocalDateString(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
