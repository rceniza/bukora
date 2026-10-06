import type { BookingStatus, BookingId } from '../models'
import type { DashboardBookingSnapshot, RecentPaymentActivity } from '../ports/DashboardRepository'
import { calculateBalanceDueMinor } from './bookingBalance'

export interface UpcomingBookingCard {
  id: BookingId
  guestName: string
  checkInDate: string
  checkOutDate: string
  status: BookingStatus
  balanceDueMinor: number
}

export interface DashboardSummary {
  bookingCount: number
  upcomingCount: number
  upcomingBookings: UpcomingBookingCard[]
  totalBalanceDueMinor: number
  recentPayments: RecentPaymentActivity[]
}

export function selectDashboardSummary(
  bookings: DashboardBookingSnapshot[],
  recentPayments: RecentPaymentActivity[],
  today: string,
  upcomingLimit = 4,
): DashboardSummary {
  const upcoming = bookings
    .filter(({ booking }) => ['tentative', 'confirmed'].includes(booking.status) && booking.checkInDate >= today)
    .sort((left, right) => left.booking.checkInDate.localeCompare(right.booking.checkInDate))

  const totalBalanceDueMinor = bookings
    .filter(({ booking }) => booking.status !== 'cancelled')
    .reduce((total, aggregate) => total + Math.max(0, calculateBalanceDueMinor(aggregate.lineItems, aggregate.payments)), 0)

  return {
    bookingCount: bookings.length,
    upcomingCount: upcoming.length,
    upcomingBookings: upcoming.slice(0, upcomingLimit).map(({ booking, lineItems, payments }) => ({
      id: booking.id,
      guestName: booking.guestName,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      status: booking.status,
      balanceDueMinor: Math.max(0, calculateBalanceDueMinor(lineItems, payments)),
    })),
    totalBalanceDueMinor,
    recentPayments,
  }
}
