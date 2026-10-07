const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * Returns the calendar date ("YYYY-MM-DD") of an API date such as
 * "2026-11-01T00:00:00Z". The date part is taken as written, never converted
 * to local time, so it cannot shift by a day.
 */
export function toDateOnly(value: string | null | undefined): string {
  if (!value) return ''
  return DATE_PREFIX.exec(value)?.[0] ?? ''
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Formats a calendar date, e.g. "1 Nov 2026". */
export function formatDate(value: string | null | undefined, fallback = '—'): string {
  const date = toDateOnly(value)
  if (!date) return fallback
  return dateFormatter.format(new Date(`${date}T00:00:00Z`))
}

/** Formats a timestamp (e.g. submitted_at) in the user's local time zone. */
export function formatDateTime(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : dateTimeFormatter.format(date)
}

/** Today's local calendar date as "YYYY-MM-DD". */
export function todayIsoDate(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Adds whole days to a "YYYY-MM-DD" date. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${toDateOnly(isoDate)}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function isIsoDate(value: string): boolean {
  const match = DATE_PREFIX.exec(value)
  if (!match || value.length !== 10) return false
  const [, y, m, d] = match.map(Number) as [number, number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}
