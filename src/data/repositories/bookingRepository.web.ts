import type { Booking, BookingActivity, BookingId, BookingLineItem, BookingPayment } from '../../domain/models'
import type { BookingAggregate, BookingListCursor, BookingRepository, BookingPage, BookingPageRequest, CreateBookingRecord } from '../../domain/ports/BookingRepository'

const STORAGE_KEY = 'bukora.bookings'

export class LocalStorageBookingRepository implements BookingRepository {
  private read(): BookingAggregate[] {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BookingAggregate[]).map((record) => ({
      ...record,
      booking: { ...record.booking, confirmationDepositAmountMinor: record.booking.confirmationDepositAmountMinor ?? 0 },
    })) : []
  }

  private write(bookings: BookingAggregate[]): void {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
  }

  async create({ booking, lineItems, initialActivity }: CreateBookingRecord): Promise<void> {
    const existing = this.read()
    if (existing.some(({ booking: saved }) => saved.id === booking.id)) throw new Error('A booking with this ID already exists.')
    this.write([...existing, { booking, lineItems, payments: [], activity: [initialActivity] }])
  }

  async listAll(): Promise<BookingAggregate[]> {
    return this.read()
  }

  async listPage(request: BookingPageRequest): Promise<BookingPage> {
    const limit = Math.max(1, Math.min(Math.floor(request.limit) || 20, 100))
    const query = request.query.trim().toLocaleLowerCase()
    const cursor = request.cursor
    const records = this.read().filter(({ booking }) => {
      const matchesFilter = request.filter === 'all'
        || (request.filter === 'cancelled'
          ? booking.status === 'cancelled'
          : booking.status !== 'cancelled' && booking.checkOutDate >= request.today)
      const matchesQuery = !query || [booking.guestName, booking.cellphone, booking.email ?? '']
        .some((value) => value.toLocaleLowerCase().includes(query))
      const afterCursor = !cursor
        || booking.checkInDate > cursor.checkInDate
        || (booking.checkInDate === cursor.checkInDate && booking.createdAt > cursor.createdAt)
        || (booking.checkInDate === cursor.checkInDate && booking.createdAt === cursor.createdAt && booking.id > cursor.id)
      return matchesFilter && matchesQuery && afterCursor
    }).sort((left, right) => left.booking.checkInDate.localeCompare(right.booking.checkInDate)
      || left.booking.createdAt.localeCompare(right.booking.createdAt)
      || left.booking.id.localeCompare(right.booking.id))
    const hasMore = records.length > limit
    const page = hasMore ? records.slice(0, limit) : records
    const lastBooking = page.at(-1)?.booking
    const nextCursor: BookingListCursor | null = hasMore && lastBooking ? {
      checkInDate: lastBooking.checkInDate,
      createdAt: lastBooking.createdAt,
      id: lastBooking.id,
    } : null
    return { records: page, nextCursor, hasMore }
  }

  async findById(id: BookingId): Promise<BookingAggregate | null> {
    return this.read().find(({ booking }) => booking.id === id) ?? null
  }

  async findOverlaps(checkInDate: string, checkOutDate: string, excludeId?: BookingId): Promise<Booking[]> {
    return this.read()
      .map(({ booking }) => booking)
      .filter((booking) => booking.id !== excludeId
        && ['tentative', 'confirmed'].includes(booking.status)
        && booking.checkInDate < checkOutDate
        && booking.checkOutDate > checkInDate)
  }

  async update(booking: Booking, activity?: BookingActivity, lineItems?: BookingLineItem[]): Promise<void> {
    const existing = this.read()
    const index = existing.findIndex(({ booking: saved }) => saved.id === booking.id)
    if (index === -1) throw new Error('Booking was not found.')
    existing[index] = {
      ...existing[index], booking,
      lineItems: lineItems ?? existing[index].lineItems,
      activity: activity ? [...existing[index].activity, activity] : existing[index].activity,
    }
    this.write(existing)
  }

  async addPayment(payment: BookingPayment, activities: BookingActivity[], bookingUpdate?: Booking): Promise<void> {
    const existing = this.read()
    const index = existing.findIndex(({ booking }) => booking.id === payment.bookingId)
    if (index === -1) throw new Error('Booking was not found.')
    existing[index] = {
      ...existing[index],
      booking: bookingUpdate ?? existing[index].booking,
      payments: [...existing[index].payments, payment],
      activity: [...existing[index].activity, ...activities],
    }
    this.write(existing)
  }

  async replaceAll(bookings: BookingAggregate[]): Promise<void> {
    this.write(bookings)
  }
}

export const bookingRepository: BookingRepository = new LocalStorageBookingRepository()
