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

export type BookingListFilter = 'upcoming' | 'all' | 'cancelled'

export interface BookingListCursor {
  checkInDate: string
  createdAt: string
  id: BookingId
}

export interface BookingPageRequest {
  filter: BookingListFilter
  query: string
  today: string
  limit: number
  cursor?: BookingListCursor | null
}

export interface BookingPage {
  records: BookingAggregate[]
  nextCursor: BookingListCursor | null
  hasMore: boolean
}

export interface BookingRepository {
  create(record: CreateBookingRecord): Promise<void>
  listAll(): Promise<BookingAggregate[]>
  listPage(request: BookingPageRequest): Promise<BookingPage>
  findById(id: BookingId): Promise<BookingAggregate | null>
  findOverlaps(checkInDate: string, checkOutDate: string, excludeId?: BookingId): Promise<Booking[]>
  update(booking: Booking, activity?: BookingActivity, lineItems?: BookingLineItem[]): Promise<void>
  addPayment(payment: BookingPayment, activities: BookingActivity[], bookingUpdate?: Booking): Promise<void>
  replaceAll(bookings: BookingAggregate[]): Promise<void>
}
