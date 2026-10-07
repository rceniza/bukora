import type { Booking, BookingActivity, BookingId, BookingPayment } from '../../domain/models'
import type { BookingAggregate, BookingRepository, CreateBookingRecord } from '../../domain/ports/BookingRepository'

const STORAGE_KEY = 'bukora.bookings'

export class LocalStorageBookingRepository implements BookingRepository {
  private read(): BookingAggregate[] {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as BookingAggregate[] : []
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

  async update(booking: Booking, activity?: BookingActivity): Promise<void> {
    const existing = this.read()
    const index = existing.findIndex(({ booking: saved }) => saved.id === booking.id)
    if (index === -1) throw new Error('Booking was not found.')
    existing[index] = { ...existing[index], booking, activity: activity ? [...existing[index].activity, activity] : existing[index].activity }
    this.write(existing)
  }

  async addPayment(payment: BookingPayment, activity: BookingActivity): Promise<void> {
    const existing = this.read()
    const index = existing.findIndex(({ booking }) => booking.id === payment.bookingId)
    if (index === -1) throw new Error('Booking was not found.')
    existing[index] = {
      ...existing[index],
      payments: [...existing[index].payments, payment],
      activity: [...existing[index].activity, activity],
    }
    this.write(existing)
  }
}

export const bookingRepository: BookingRepository = new LocalStorageBookingRepository()
