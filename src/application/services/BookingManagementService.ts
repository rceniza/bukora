import { bookingFormSchema } from '../../domain/schemas/booking'
import type { BookingFormInput } from '../../domain/schemas/booking'
import { calculateBookingQuote } from '../../domain/services/bookingQuote'
import type { BookingQuoteOptions, PricingRates } from '../../domain/services/bookingQuote'
import type { Booking, BookingActivity, BookingId, BookingLineItem, UUID } from '../../domain/models'
import type { BookingAggregate, BookingRepository } from '../../domain/ports/BookingRepository'
import { createUUID } from '../../shared/utils/uuid'

export interface BookingPricingUpdate {
  options: BookingQuoteOptions
  rates: PricingRates
}

export class BookingManagementService {
  constructor(
    private readonly repository: BookingRepository,
    private readonly createId: () => UUID = createUUID,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async updateDetails(id: BookingId, input: BookingFormInput, pricing?: BookingPricingUpdate): Promise<BookingAggregate> {
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
    const updatedLineItems = pricing
      ? calculateBookingQuote(pricing.options, pricing.rates).lineItems.map((item): BookingLineItem => ({
        ...item,
        id: this.createId(),
        bookingId: booking.id,
        createdAt: booking.updatedAt,
      }))
      : current.lineItems
    const pricingChanged = pricing !== undefined && !samePriceBreakdown(current.lineItems, updatedLineItems)
    const changedDates = booking.checkInDate !== current.booking.checkInDate || booking.checkOutDate !== current.booking.checkOutDate
    const activity = this.makeActivity(booking, booking.updatedAt, changedDates ? 'booking_rescheduled' : 'booking_updated',
      changedDates ? `Booking dates changed for ${booking.guestName}`
        : pricingChanged ? `Booking details and price updated for ${booking.guestName}`
          : `Booking details updated for ${booking.guestName}`, {
        previous: {
          guestName: current.booking.guestName, address: current.booking.address, cellphone: current.booking.cellphone,
          email: current.booking.email, pax: current.booking.pax, checkInDate: current.booking.checkInDate,
          checkOutDate: current.booking.checkOutDate, notes: current.booking.notes,
          ...(pricingChanged ? { lineItems: current.lineItems.map(toPriceHistoryItem), totalAmountMinor: sumLineItems(current.lineItems) } : {}),
        },
        next: {
          guestName: booking.guestName, address: booking.address, cellphone: booking.cellphone,
          email: booking.email, pax: booking.pax, checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate, notes: booking.notes,
          ...(pricingChanged ? { lineItems: updatedLineItems.map(toPriceHistoryItem), totalAmountMinor: sumLineItems(updatedLineItems) } : {}),
        },
      })
    await this.repository.update(booking, activity, pricingChanged ? updatedLineItems : undefined)
    return { ...current, booking, lineItems: pricingChanged ? updatedLineItems : current.lineItems, activity: [...current.activity, activity] }
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

function toPriceHistoryItem(item: BookingLineItem) {
  return { kind: item.kind, description: item.description, quantity: item.quantity, unitAmountMinor: item.unitAmountMinor, totalAmountMinor: item.totalAmountMinor }
}

function sumLineItems(items: BookingLineItem[]): number {
  return items.reduce((total, item) => total + item.totalAmountMinor, 0)
}

function samePriceBreakdown(previous: BookingLineItem[], next: BookingLineItem[]): boolean {
  return previous.length === next.length && previous.every((item, index) => {
    const candidate = next[index]
    return candidate !== undefined && item.kind === candidate.kind && item.description === candidate.description
      && item.quantity === candidate.quantity && item.unitAmountMinor === candidate.unitAmountMinor
  })
}
