import { addDays, differenceInCalendarDays, format, isValid, parse } from 'date-fns'

const ISO_DATE_FORMAT = 'yyyy-MM-dd'

export function parseISODate(value: string): Date | null {
  const parsed = parse(value, ISO_DATE_FORMAT, new Date(0))
  return isValid(parsed) && format(parsed, ISO_DATE_FORMAT) === value ? parsed : null
}

export function isValidISODate(value: string): boolean {
  return parseISODate(value) !== null
}

export function isDateRangeValid(checkInDate: string, checkOutDate: string): boolean {
  return isValidISODate(checkInDate)
    && isValidISODate(checkOutDate)
    && checkOutDate > checkInDate
}

export function checkoutAfterChangingCheckIn(
  currentCheckInDate: string,
  currentCheckOutDate: string,
  nextCheckInDate: string,
): string {
  const currentCheckIn = parseISODate(currentCheckInDate)
  const currentCheckOut = parseISODate(currentCheckOutDate)
  const nextCheckIn = parseISODate(nextCheckInDate)
  if (!nextCheckIn) return currentCheckOutDate

  const currentNights = currentCheckIn && currentCheckOut
    ? differenceInCalendarDays(currentCheckOut, currentCheckIn)
    : 0
  const nights = currentNights > 0 ? currentNights : 1
  return format(addDays(nextCheckIn, nights), ISO_DATE_FORMAT)
}

export function minimumCheckoutDate(checkInDate: string): string | null {
  const checkIn = parseISODate(checkInDate)
  return checkIn ? format(addDays(checkIn, 1), ISO_DATE_FORMAT) : null
}

export function getStayNightCount(checkInDate: string, checkOutDate: string): number | null {
  if (!isDateRangeValid(checkInDate, checkOutDate)) return null
  const checkIn = parseISODate(checkInDate)
  const checkOut = parseISODate(checkOutDate)
  return checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : null
}

export function formatDisplayDate(value: string): string {
  const parsed = parseISODate(value)
  return parsed ? format(parsed, 'MMM d, yyyy') : value
}
