import { bookingFormSchema } from '../../domain/schemas/booking'
import type { BookingFormInput } from '../../domain/schemas/booking'
import type { Booking, BookingActivity, BookingId, UUID } from '../../domain/models'
import type { BookingAggregate, BookingRepository } from '../../domain/ports/BookingRepository'
import { createUUID } from '../../shared/utils/uuid'

export class BookingManagementService {
  constructor(
    private readonly repository: BookingRepository,
    private readonly createId: () => UUID = createUUID,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async updateDetails(id: BookingId, input: BookingFormInput): Promise<BookingAggregate> {
    const current = await this.requireBooking(id)
    const next = bookingFormSchema.parse(input)
    const conflicts = await this.repository.findOverlaps(next.checkInDate, next.checkOutDate, id)
    if (conflicts.length) throw new Error('These dates overlap another active booking.')
    const booking: Booking = {
      ...current.booking,
      ...next,
      pax: next.pax ?? 0,
      updatedAt: this.now(),
    }
    const changedDates = booking.checkInDate !== current.booking.checkInDate || booking.checkOutDate !== current.booking.checkOutDate
    const activity = this.makeActivity(booking, booking.updatedAt, changedDates ? 'booking_rescheduled' : 'booking_updated',
      changedDates ? `Booking dates changed for ${booking.guestName}` : `Booking details updated for ${booking.guestName}`, {
        previous: { guestName: current.booking.guestName, checkInDate: current.booking.checkInDate, checkOutDate: current.booking.checkOutDate },
        next: { guestName: booking.guestName, checkInDate: booking.checkInDate, checkOutDate: booking.checkOutDate },
      })
    await this.repository.update(booking, activity)
    return { ...current, booking, activity: [...current.activity, activity] }
  }

  async cancel(id: BookingId, reason?: string): Promise<BookingAggregate> {
    const current = await this.requireBooking(id)
    if (current.booking.status === 'cancelled') throw new Error('This booking is already cancelled.')
    const updatedAt = this.now()
    const booking: Booking = { ...current.booking, status: 'cancelled', cancelledAt: updatedAt, updatedAt }
    const activity = this.makeActivity(booking, updatedAt, 'booking_cancelled', `Booking cancelled for ${booking.guestName}`, {
      reason: reason?.trim() || null,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
    })
    await this.repository.update(booking, activity)
    return { ...current, booking, activity: [...current.activity, activity] }
  }

  private async requireBooking(id: BookingId): Promise<BookingAggregate> {
    const result = await this.repository.findById(id)
    if (!result) throw new Error('Booking was not found.')
    return result
  }

  private makeActivity(booking: Booking, createdAt: string, eventType: string, summary: string, details: Record<string, unknown>): BookingActivity {
    return { id: this.createId(), bookingId: booking.id, eventType, summary, details, createdAt }
  }
}
