import type { BookingId } from '../models'
import type { AvailabilityBooking } from './dashboardSummary'
import { buildBookingAvailabilityMap } from './bookingAvailability'

function booking(
  id: string,
  checkInDate: string,
  checkOutDate: string,
  status: AvailabilityBooking['status'] = 'confirmed',
): AvailabilityBooking {
  return { id: id as BookingId, guestName: `Guest ${id}`, checkInDate, checkOutDate, status }
}

describe('buildBookingAvailabilityMap', () => {
  it('marks each occupied night for tentative and confirmed bookings but excludes checkout', () => {
    const tentative = booking('00000000-0000-4000-8000-000000000001', '2026-10-10', '2026-10-12', 'tentative')
    const confirmed = booking('00000000-0000-4000-8000-000000000002', '2026-10-15', '2026-10-16')

    const days = buildBookingAvailabilityMap([tentative, confirmed])

    expect([...days.keys()]).toEqual(['2026-10-10', '2026-10-11', '2026-10-15'])
    expect(days.get('2026-10-10')).toEqual([tentative])
    expect(days.has('2026-10-12')).toBe(false)
  })

  it('excludes cancelled and completed stays from blocking availability', () => {
    const days = buildBookingAvailabilityMap([
      booking('00000000-0000-4000-8000-000000000003', '2026-10-10', '2026-10-11', 'cancelled'),
      booking('00000000-0000-4000-8000-000000000004', '2026-10-12', '2026-10-13', 'completed'),
    ])

    expect(days.size).toBe(0)
  })

  it('treats adjacent checkout and check-in dates correctly', () => {
    const first = booking('00000000-0000-4000-8000-000000000005', '2026-10-10', '2026-10-12')
    const next = booking('00000000-0000-4000-8000-000000000006', '2026-10-12', '2026-10-13')
    const days = buildBookingAvailabilityMap([first, next])

    expect(days.get('2026-10-11')).toEqual([first])
    expect(days.get('2026-10-12')).toEqual([next])
    expect(days.get('2026-10-13')).toBeUndefined()
  })

  it('retains every active booking if legacy or manually overridden data overlaps', () => {
    const first = booking('00000000-0000-4000-8000-000000000013', '2026-10-10', '2026-10-12')
    const second = booking('00000000-0000-4000-8000-000000000014', '2026-10-11', '2026-10-13', 'tentative')
    const days = buildBookingAvailabilityMap([first, second])

    expect(days.get('2026-10-11')).toEqual([first, second])
    expect(days.get('2026-10-12')).toEqual([second])
  })

  it('crosses month and year boundaries and includes leap day', () => {
    const days = buildBookingAvailabilityMap([
      booking('00000000-0000-4000-8000-000000000007', '2026-12-31', '2027-01-02'),
      booking('00000000-0000-4000-8000-000000000008', '2028-02-28', '2028-03-01'),
    ])

    expect([...days.keys()]).toEqual(['2026-12-31', '2027-01-01', '2028-02-28', '2028-02-29'])
  })

  it('uses calendar-day stepping across daylight-saving transition dates', () => {
    const days = buildBookingAvailabilityMap([
      booking('00000000-0000-4000-8000-000000000009', '2026-03-07', '2026-03-10'),
    ])

    expect([...days.keys()]).toEqual(['2026-03-07', '2026-03-08', '2026-03-09'])
  })

  it('skips invalid dates and empty or reversed ranges safely', () => {
    const days = buildBookingAvailabilityMap([
      booking('00000000-0000-4000-8000-000000000010', '2026-02-30', '2026-03-01'),
      booking('00000000-0000-4000-8000-000000000011', '2026-10-10', '2026-10-10'),
      booking('00000000-0000-4000-8000-000000000012', '2026-10-12', '2026-10-11'),
    ])

    expect(days.size).toBe(0)
    expect(buildBookingAvailabilityMap([])).toEqual(new Map())
  })
})
