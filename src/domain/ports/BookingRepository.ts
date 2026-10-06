import type { Booking, BookingActivity, BookingLineItem, BookingPayment, BookingId } from '../models'

export interface BookingAggregate {
  booking: Booking
  lineItems: BookingLineItem[]
  payments: BookingPayment[]
  activity: BookingActivity[]
}

export interface CreateBookingRecord {
  booking: Booking
  lineItems: BookingLineItem[]
  initialActivity: BookingActivity
}

export interface BookingRepository {
  create(record: CreateBookingRecord): Promise<void>
  findById(id: BookingId): Promise<BookingAggregate | null>
  update(booking: Booking): Promise<void>
}
