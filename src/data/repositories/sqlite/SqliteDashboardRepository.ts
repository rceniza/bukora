import type { Booking, BookingId, BookingLineItem, BookingPayment } from '../../../domain/models'
import type { DashboardBookingSnapshot, DashboardRepository, DashboardSnapshot, RecentPaymentActivity } from '../../../domain/ports/DashboardRepository'
import type { SqliteClient } from '../../database/SqliteClient'

function groupByBooking<T extends { bookingId: BookingId }>(rows: T[]): Map<BookingId, T[]> {
  const grouped = new Map<BookingId, T[]>()
  for (const row of rows) {
    const items = grouped.get(row.bookingId) ?? []
    items.push(row)
    grouped.set(row.bookingId, items)
  }
  return grouped
}

export class SqliteDashboardRepository implements DashboardRepository {
  constructor(private readonly client: SqliteClient) {}

  async getSnapshot(recentPaymentLimit: number): Promise<DashboardSnapshot> {
    const [bookings, lineItems, payments, recentPayments] = await Promise.all([
      this.client.all<Booking>(`SELECT id, status, guest_name AS guestName, address, cellphone, email, pax,
        check_in_date AS checkInDate, check_out_date AS checkOutDate, notes, created_at AS createdAt,
        updated_at AS updatedAt, cancelled_at AS cancelledAt FROM bookings ORDER BY check_in_date, created_at, id`),
      this.client.all<BookingLineItem>(`SELECT id, booking_id AS bookingId, kind, description, quantity,
        unit_amount_minor AS unitAmountMinor, total_amount_minor AS totalAmountMinor, created_at AS createdAt
        FROM booking_line_items ORDER BY booking_id, created_at, id`),
      this.client.all<BookingPayment>(`SELECT id, booking_id AS bookingId, kind, amount_minor AS amountMinor,
        paid_at AS paidAt, method, transaction_reference AS transactionReference, notes, created_at AS createdAt
        FROM payments ORDER BY booking_id, paid_at, created_at, id`),
      this.client.all<RecentPaymentActivity>(`SELECT p.id, p.booking_id AS bookingId, p.kind,
        p.amount_minor AS amountMinor, p.paid_at AS paidAt, p.method,
        p.transaction_reference AS transactionReference, p.notes, p.created_at AS createdAt,
        b.guest_name AS guestName FROM payments p INNER JOIN bookings b ON b.id = p.booking_id
        ORDER BY p.paid_at DESC, p.created_at DESC, p.id DESC LIMIT ?`,
      [Math.max(0, Math.floor(recentPaymentLimit))]),
    ])

    const lineItemsByBooking = groupByBooking(lineItems)
    const paymentsByBooking = groupByBooking(payments)
    const bookingSnapshots: DashboardBookingSnapshot[] = bookings.map((booking) => ({
      booking,
      lineItems: lineItemsByBooking.get(booking.id) ?? [],
      payments: paymentsByBooking.get(booking.id) ?? [],
    }))

    return { bookings: bookingSnapshots, recentPayments }
  }
}
