import { addDays, format } from 'date-fns'
import type { AvailabilityBooking } from './dashboardSummary'
import { isDateRangeValid, parseISODate } from '../../shared/utils/date'

/** Returns the active booking(s) that hold each occupied night, keyed by local ISO date. */
export function buildBookingAvailabilityMap(
  bookings: AvailabilityBooking[],
): Map<string, AvailabilityBooking[]> {
  const availability = new Map<string, AvailabilityBooking[]>()

  for (const booking of bookings) {
    if (booking.status !== 'tentative' && booking.status !== 'confirmed') continue
    if (!isDateRangeValid(booking.checkInDate, booking.checkOutDate)) continue

    const checkIn = parseISODate(booking.checkInDate)
    const checkOut = parseISODate(booking.checkOutDate)
    if (!checkIn || !checkOut) continue

    for (let date = checkIn; date < checkOut; date = addDays(date, 1)) {
      const key = format(date, 'yyyy-MM-dd')
      availability.set(key, [...(availability.get(key) ?? []), booking])
    }
  }

  return availability
}
