import type { Booking, BookingLineItem, BookingPayment } from '../models'

export interface DashboardBookingSnapshot {
  booking: Booking
  lineItems: BookingLineItem[]
  payments: BookingPayment[]
}

export interface RecentPaymentActivity extends BookingPayment {
  guestName: string
}

export interface DashboardSnapshot {
  bookings: DashboardBookingSnapshot[]
  recentPayments: RecentPaymentActivity[]
}

export interface DashboardRepository {
  getSnapshot(recentPaymentLimit: number): Promise<DashboardSnapshot>
}
