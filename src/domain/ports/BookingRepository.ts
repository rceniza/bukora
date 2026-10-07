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
  listAll(): Promise<BookingAggregate[]>
  findById(id: BookingId): Promise<BookingAggregate | null>
  findOverlaps(checkInDate: string, checkOutDate: string, excludeId?: BookingId): Promise<Booking[]>
  update(booking: Booking, activity?: BookingActivity): Promise<void>
  addPayment(payment: BookingPayment, activity: BookingActivity): Promise<void>
  replaceAll(bookings: BookingAggregate[]): Promise<void>
}
