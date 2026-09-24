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
