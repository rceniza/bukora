import { checkoutAfterChangingCheckIn, formatDisplayDate, getStayNightCount, isDateRangeValid, isValidISODate, minimumCheckoutDate } from './date'

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

  it('moves checkout with check-in while preserving the selected number of nights', () => {
    expect(checkoutAfterChangingCheckIn('2026-06-12', '2026-06-13', '2026-07-20')).toBe('2026-07-21')
    expect(checkoutAfterChangingCheckIn('2026-06-12', '2026-06-15', '2026-07-20')).toBe('2026-07-23')
  })

  it('uses a one-night stay if the current date range is invalid', () => {
    expect(checkoutAfterChangingCheckIn('2026-06-12', '2026-06-12', '2026-07-20')).toBe('2026-07-21')
  })

  it('requires checkout to be at least the day after check-in', () => {
    expect(minimumCheckoutDate('2026-10-10')).toBe('2026-10-11')
    expect(minimumCheckoutDate('invalid')).toBeNull()
  })

  it('counts nights between check-in and check-out without counting checkout day', () => {
    expect(getStayNightCount('2026-10-10', '2026-10-11')).toBe(1)
    expect(getStayNightCount('2026-10-10', '2026-10-13')).toBe(3)
    expect(getStayNightCount('2026-10-10', '2026-10-10')).toBeNull()
  })
})
