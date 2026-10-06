import type { Booking, BookingActivity, BookingLineItem, BookingId } from '../models'

export interface BookingAggregate {
  booking: Booking
  lineItems: BookingLineItem[]
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
