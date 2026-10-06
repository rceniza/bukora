import { format, isValid, parse } from 'date-fns'

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

export function formatDisplayDate(value: string): string {
  const parsed = parseISODate(value)
  return parsed ? format(parsed, 'MMM d, yyyy') : value
}
