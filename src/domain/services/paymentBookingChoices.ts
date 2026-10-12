import type { BookingAggregate } from '../ports/BookingRepository'

export const PAYMENT_BOOKING_PREVIEW_LIMIT = 5
export const PAYMENT_BOOKING_SEARCH_LIMIT = 20

export interface PaymentBookingChoices {
  items: BookingAggregate[]
  total: number
  searching: boolean
}

export function selectPaymentBookingChoices(
  records: BookingAggregate[],
  query: string,
  today: string,
): PaymentBookingChoices {
  const normalized = query.trim().toLocaleLowerCase()
  const matches = records.filter(({ booking }) => !normalized || [
    booking.guestName,
    booking.cellphone,
    booking.email ?? '',
    booking.checkInDate,
  ].some((value) => value.toLocaleLowerCase().includes(normalized)))
    .sort((a, b) => a.booking.checkInDate.localeCompare(b.booking.checkInDate))
  const upcoming = matches.filter(({ booking }) => booking.status !== 'cancelled'
    && booking.status !== 'completed'
    && booking.checkOutDate >= today)
  const items = normalized
    ? matches.slice(0, PAYMENT_BOOKING_SEARCH_LIMIT)
    : upcoming.slice(0, PAYMENT_BOOKING_PREVIEW_LIMIT)

  return { items, total: normalized ? matches.length : upcoming.length, searching: Boolean(normalized) }
}
