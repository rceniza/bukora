import { formatDisplayDate, isDateRangeValid, isValidISODate } from './date'

describe('date utilities', () => {
  it('accepts valid ISO dates and rejects impossible dates', () => {
    expect(isValidISODate('2024-02-29')).toBe(true)
    expect(isValidISODate('2025-02-29')).toBe(false)
    expect(isValidISODate('2025-13-01')).toBe(false)
  })

  it('requires check-out to be later than check-in', () => {
    expect(isDateRangeValid('2026-06-12', '2026-06-13')).toBe(true)
    expect(isDateRangeValid('2026-06-12', '2026-06-12')).toBe(false)
    expect(isDateRangeValid('2026-06-14', '2026-06-13')).toBe(false)
  })

  it('formats valid dates and leaves invalid input visible for correction', () => {
    expect(formatDisplayDate('2026-06-12')).toBe('Jun 12, 2026')
    expect(formatDisplayDate('not-a-date')).toBe('not-a-date')
  })
})
