import { describe, expect, it } from 'vitest'
import { formatDate, isIsoDate, todayIsoDate, toDateOnly } from './dates'

describe('dates', () => {
  it('takes the calendar date from RFC3339 values without timezone conversion', () => {
    expect(toDateOnly('2026-11-01T00:00:00Z')).toBe('2026-11-01')
    // Late in the day UTC would be the next day in UTC+8; the written date wins.
    expect(toDateOnly('2026-11-01T23:30:00Z')).toBe('2026-11-01')
    expect(toDateOnly(undefined)).toBe('')
  })

  it('formats dates in a fixed (UTC) zone', () => {
    expect(formatDate('2026-11-01T00:00:00Z')).toBe('1 Nov 2026')
    expect(formatDate('2026-01-31')).toBe('31 Jan 2026')
    expect(formatDate(undefined)).toBe('—')
  })

  it('validates YYYY-MM-DD strings', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-2-3')).toBe(false)
  })

  it('returns the local date for today', () => {
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 0))).toBe('2026-01-05')
  })
})
