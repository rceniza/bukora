import type { BookingActivity, BookingId, BookingLineItem, BookingPayment, Booking, UUID } from '../../../domain/models'
import type { BookingAggregate, BookingRepository, CreateBookingRecord } from '../../../domain/ports/BookingRepository'
import type { SqliteClient } from '../../database/SqliteClient'

interface BookingRow {
  id: UUID
  status: Booking['status']
  guestName: string
  address: string | null
  cellphone: string
  email: string | null
  pax: number
  checkInDate: string
  checkOutDate: string
  notes: string | null
  createdAt: string
  updatedAt: string
  cancelledAt: string | null
}

type LineItemRow = BookingLineItem
type PaymentRow = BookingPayment

interface ActivityRow {
  id: UUID
  bookingId: UUID
  eventType: string
  summary: string
  detailsJson: string | null
  createdAt: string
}

const bookingColumns = 'id, status, guest_name, address, cellphone, email, pax, check_in_date, check_out_date, notes, created_at, updated_at, cancelled_at'
const bookingFields = `id, status, guest_name AS guestName, address, cellphone, email, pax,
  check_in_date AS checkInDate, check_out_date AS checkOutDate, notes,
  created_at AS createdAt, updated_at AS updatedAt, cancelled_at AS cancelledAt`

export class SqliteBookingRepository implements BookingRepository {
  constructor(private readonly client: SqliteClient) {}

  async listAll(): Promise<BookingAggregate[]> {
    const rows = await this.client.all<{ id: BookingId }>('SELECT id FROM bookings ORDER BY check_in_date, created_at, id')
    return (await Promise.all(rows.map(({ id }) => this.findById(id))))
      .filter((booking): booking is BookingAggregate => booking !== null)
  }

  async create({ booking, lineItems, initialActivity }: CreateBookingRecord): Promise<void> {
    await this.client.transaction(async (transaction) => {
      await transaction.execute(
        `INSERT INTO bookings (${bookingColumns})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [booking.id, booking.status, booking.guestName, booking.address, booking.cellphone, booking.email,
          booking.pax, booking.checkInDate, booking.checkOutDate, booking.notes, booking.createdAt,
          booking.updatedAt, booking.cancelledAt],
      )

      for (const item of lineItems) {
        await transaction.execute(
          `INSERT INTO booking_line_items
           (id, booking_id, kind, description, quantity, unit_amount_minor, total_amount_minor, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.bookingId, item.kind, item.description, item.quantity, item.unitAmountMinor,
            item.totalAmountMinor, item.createdAt],
        )
      }

      await transaction.execute(
        `INSERT INTO booking_activity (id, booking_id, event_type, summary, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [initialActivity.id, initialActivity.bookingId, initialActivity.eventType, initialActivity.summary,
          initialActivity.details === null ? null : JSON.stringify(initialActivity.details), initialActivity.createdAt],
      )
    })
  }

  async findById(id: BookingId): Promise<BookingAggregate | null> {
    const booking = await this.client.first<BookingRow>(`SELECT ${bookingFields} FROM bookings WHERE id = ?`, [id])
    if (!booking) return null

    const [lineItems, payments, activityRows] = await Promise.all([
      this.client.all<LineItemRow>(
        `SELECT id, booking_id AS bookingId, kind, description, quantity,
          unit_amount_minor AS unitAmountMinor, total_amount_minor AS totalAmountMinor,
          created_at AS createdAt FROM booking_line_items WHERE booking_id = ? ORDER BY created_at, id`,
        [id],
      ),
      this.client.all<PaymentRow>(
        `SELECT id, booking_id AS bookingId, kind, amount_minor AS amountMinor, paid_at AS paidAt,
          method, transaction_reference AS transactionReference, notes, created_at AS createdAt
         FROM payments WHERE booking_id = ? ORDER BY paid_at, created_at, id`,
        [id],
      ),
      this.client.all<ActivityRow>(
        `SELECT id, booking_id AS bookingId, event_type AS eventType, summary,
          details_json AS detailsJson, created_at AS createdAt FROM booking_activity
         WHERE booking_id = ? ORDER BY created_at, id`,
        [id],
      ),
    ])

    return {
      booking,
      lineItems,
      payments,
      activity: activityRows.map(({ detailsJson, ...activity }): BookingActivity => ({
        ...activity,
        details: detailsJson === null ? null : JSON.parse(detailsJson) as Record<string, unknown>,
      })),
    }
  }

  findOverlaps(checkInDate: string, checkOutDate: string, excludeId?: BookingId): Promise<Booking[]> {
    const excludedClause = excludeId ? ' AND id != ?' : ''
    const values = excludeId ? [checkOutDate, checkInDate, excludeId] : [checkOutDate, checkInDate]
    return this.client.all<Booking>(
      `SELECT ${bookingFields} FROM bookings
       WHERE status IN ('tentative', 'confirmed') AND check_in_date < ? AND check_out_date > ?${excludedClause}
       ORDER BY check_in_date, guest_name, id`,
      values,
    )
  }

  async update(booking: Booking, activity?: BookingActivity): Promise<void> {
    await this.client.transaction(async (transaction) => {
      await transaction.execute(
        `UPDATE bookings SET status = ?, guest_name = ?, address = ?, cellphone = ?, email = ?, pax = ?,
         check_in_date = ?, check_out_date = ?, notes = ?, updated_at = ?, cancelled_at = ? WHERE id = ?`,
        [booking.status, booking.guestName, booking.address, booking.cellphone, booking.email, booking.pax,
          booking.checkInDate, booking.checkOutDate, booking.notes, booking.updatedAt, booking.cancelledAt, booking.id],
      )
      if (activity) {
        await transaction.execute(
          `INSERT INTO booking_activity (id, booking_id, event_type, summary, details_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [activity.id, activity.bookingId, activity.eventType, activity.summary,
            activity.details === null ? null : JSON.stringify(activity.details), activity.createdAt],
        )
      }
    })
  }

  async addPayment(payment: BookingPayment, activity: BookingActivity): Promise<void> {
    await this.client.transaction(async (transaction) => {
      await transaction.execute(
        `INSERT INTO payments (id, booking_id, kind, amount_minor, paid_at, method, transaction_reference, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [payment.id, payment.bookingId, payment.kind, payment.amountMinor, payment.paidAt, payment.method,
          payment.transactionReference, payment.notes, payment.createdAt],
      )
      await transaction.execute(
        `INSERT INTO booking_activity (id, booking_id, event_type, summary, details_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [activity.id, activity.bookingId, activity.eventType, activity.summary,
          activity.details === null ? null : JSON.stringify(activity.details), activity.createdAt],
      )
    })
  }
}
