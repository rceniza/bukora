import { bookingFormSchema } from '../../domain/schemas/booking'
import type { BookingFormInput } from '../../domain/schemas/booking'
import { calculateBookingQuote } from '../../domain/services/bookingQuote'
import type { BookingQuoteOptions, PricingRates } from '../../domain/services/bookingQuote'
import type { Booking, BookingActivity, BookingLineItem, UUID } from '../../domain/models'
import { createUUID } from '../../shared/utils/uuid'
import type { BookingAggregate, BookingRepository } from '../../domain/ports/BookingRepository'

export interface CreateBookingCommand {
  booking: BookingFormInput
  pricing: BookingQuoteOptions
}

export interface CreateBookingServiceDependencies {
  repository: BookingRepository
  rates?: PricingRates
  createId?: () => UUID
  now?: () => string
}

export class CreateBookingService {
  private readonly rates?: PricingRates
  private readonly createId: () => UUID
  private readonly now: () => string

  constructor(private readonly repository: BookingRepository, dependencies: Omit<CreateBookingServiceDependencies, 'repository'> = {}) {
    this.rates = dependencies.rates
    this.createId = dependencies.createId ?? createUUID
    this.now = dependencies.now ?? (() => new Date().toISOString())
  }

  async create(command: CreateBookingCommand): Promise<BookingAggregate> {
    const guest = bookingFormSchema.parse(command.booking)
    const quote = calculateBookingQuote(command.pricing, this.rates)
    const createdAt = this.now()
    const booking: Booking = {
      id: this.createId(),
      status: 'confirmed',
      guestName: guest.guestName,
      address: guest.address,
      cellphone: guest.cellphone,
      email: guest.email,
      pax: guest.pax ?? 0,
      checkInDate: guest.checkInDate,
      checkOutDate: guest.checkOutDate,
      notes: guest.notes,
      createdAt,
      updatedAt: createdAt,
      cancelledAt: null,
    }
    const lineItems: BookingLineItem[] = quote.lineItems.map((item) => ({
      ...item,
      id: this.createId(),
      bookingId: booking.id,
      createdAt,
    }))
    const initialActivity: BookingActivity = {
      id: this.createId(),
      bookingId: booking.id,
      eventType: 'booking_created',
      summary: `Booking created for ${booking.guestName}`,
      details: {
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        totalAmountMinor: quote.totalAmountMinor,
      },
      createdAt,
    }

    await this.repository.create({ booking, lineItems, initialActivity })
    return { booking, lineItems, activity: [initialActivity] }
  }
}
