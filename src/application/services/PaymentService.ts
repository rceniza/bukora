import { paymentEntrySchema } from '../../domain/schemas/booking'
import type { PaymentEntryInput } from '../../domain/schemas/booking'
import type { BookingActivity, BookingId, BookingPayment, UUID } from '../../domain/models'
import type { BookingAggregate, BookingRepository } from '../../domain/ports/BookingRepository'
import { calculateNetPaymentsMinor } from '../../domain/services/bookingBalance'
import { createUUID } from '../../shared/utils/uuid'

export class PaymentService {
  constructor(
    private readonly repository: BookingRepository,
    private readonly createId: () => UUID = createUUID,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async record(bookingId: BookingId, input: PaymentEntryInput): Promise<BookingAggregate> {
    const entry = paymentEntrySchema.parse(input)
    const current = await this.repository.findById(bookingId)
    if (!current) throw new Error('Booking was not found.')
    if (entry.kind === 'refund' && entry.amountMinor > calculateNetPaymentsMinor(current.payments)) {
      throw new Error('Refund cannot exceed the amount paid so far.')
    }
    const createdAt = this.now()
    const payment: BookingPayment = {
      id: this.createId(), bookingId, ...entry, method: entry.method,
      transactionReference: entry.transactionReference, notes: entry.notes, createdAt,
    }
    const activity: BookingActivity = {
      id: this.createId(), bookingId,
      eventType: entry.kind === 'refund' ? 'payment_refunded' : 'payment_recorded',
      summary: `${entry.kind === 'refund' ? 'Refund recorded' : 'Payment recorded'} for ${current.booking.guestName}`,
      details: { paymentId: payment.id, kind: entry.kind, amountMinor: entry.amountMinor, paidAt: entry.paidAt,
        transactionReference: entry.transactionReference },
      createdAt,
    }
    const payments = [...current.payments, payment]
    const netPaid = calculateNetPaymentsMinor(payments)
    const confirmsBooking = current.booking.status === 'tentative'
      && entry.kind === 'payment'
      && netPaid >= current.booking.confirmationDepositAmountMinor
    const booking = confirmsBooking
      ? { ...current.booking, status: 'confirmed' as const, updatedAt: createdAt }
      : current.booking
    const activities = confirmsBooking
      ? [activity, {
        id: this.createId(), bookingId,
        eventType: 'booking_confirmed',
        summary: `Booking confirmed for ${current.booking.guestName}`,
        details: {
          paymentId: payment.id,
          confirmationDepositAmountMinor: current.booking.confirmationDepositAmountMinor,
          netPaidAmountMinor: netPaid,
        },
        createdAt,
      } satisfies BookingActivity]
      : [activity]
    await this.repository.addPayment(payment, activities, confirmsBooking ? booking : undefined)
    return { ...current, booking, payments, activity: [...current.activity, ...activities] }
  }
}
