import type { BookingActivity, BookingId, BookingLineItem, BookingPayment, Booking, UUID } from '../../../domain/models'
import type { BookingAggregate, BookingListCursor, BookingRepository, BookingPage, BookingPageRequest, CreateBookingRecord } from '../../../domain/ports/BookingRepository'
import type { SqliteClient } from '../../database/SqliteClient'

interface BookingRow {
  id: UUID
  status: Booking['status']
  confirmationDepositAmountMinor: number
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

const bookingColumns = 'id, status, confirmation_deposit_amount_minor, guest_name, address, cellphone, email, pax, check_in_date, check_out_date, notes, created_at, updated_at, cancelled_at'
const bookingFields = `id, status, confirmation_deposit_amount_minor AS confirmationDepositAmountMinor, guest_name AS guestName, address, cellphone, email, pax,
  check_in_date AS checkInDate, check_out_date AS checkOutDate, notes,
  created_at AS createdAt, updated_at AS updatedAt, cancelled_at AS cancelledAt`

export class SqliteBookingRepository implements BookingRepository {
  constructor(private readonly client: SqliteClient) {}

  async listAll(): Promise<BookingAggregate[]> {
    const rows = await this.client.all<{ id: BookingId }>('SELECT id FROM bookings ORDER BY check_in_date, created_at, id')
    return (await Promise.all(rows.map(({ id }) => this.findById(id))))
      .filter((booking): booking is BookingAggregate => booking !== null)
  }

  async listPage(request: BookingPageRequest): Promise<BookingPage> {
    const limit = Math.max(1, Math.min(Math.floor(request.limit) || 20, 100))
    const clauses: string[] = []
    const values: (string | number | null)[] = []
    if (request.filter === 'upcoming') {
      clauses.push("status != 'cancelled' AND check_out_date >= ?")
      values.push(request.today)
    } else if (request.filter === 'cancelled') {
      clauses.push("status = 'cancelled'")
    }
    const query = request.query.trim()
    if (query) {
      clauses.push("(guest_name LIKE ? COLLATE NOCASE OR cellphone LIKE ? COLLATE NOCASE OR email LIKE ? COLLATE NOCASE)")
      const pattern = `%${query}%`
      values.push(pattern, pattern, pattern)
    }
    if (request.cursor) {
      clauses.push(`(check_in_date > ? OR (check_in_date = ? AND created_at > ?)
        OR (check_in_date = ? AND created_at = ? AND id > ?))`)
      values.push(request.cursor.checkInDate, request.cursor.checkInDate, request.cursor.createdAt,
        request.cursor.checkInDate, request.cursor.createdAt, request.cursor.id)
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = await this.client.all<Pick<Booking, 'id'>>(
      `SELECT id FROM bookings ${where} ORDER BY check_in_date, created_at, id LIMIT ?`,
      [...values, limit + 1],
    )
    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    const records = (await Promise.all(pageRows.map(({ id }) => this.findById(id))))
      .filter((record): record is BookingAggregate => record !== null)
    const lastBooking = records.at(-1)?.booking
    const nextCursor: BookingListCursor | null = hasMore && lastBooking ? {
      checkInDate: lastBooking.checkInDate,
      createdAt: lastBooking.createdAt,
      id: lastBooking.id,
    } : null
    return { records, nextCursor, hasMore }
  }

  async create({ booking, lineItems, initialActivity }: CreateBookingRecord): Promise<void> {
    await this.client.transaction(async (transaction) => {
      await transaction.execute(
        `INSERT INTO bookings (${bookingColumns})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [booking.id, booking.status, booking.confirmationDepositAmountMinor, booking.guestName, booking.address, booking.cellphone, booking.email,
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

  async update(booking: Booking, activity?: BookingActivity, lineItems?: BookingLineItem[]): Promise<void> {
    await this.client.transaction(async (transaction) => {
      await transaction.execute(
        `UPDATE bookings SET status = ?, confirmation_deposit_amount_minor = ?, guest_name = ?, address = ?, cellphone = ?, email = ?, pax = ?,
         check_in_date = ?, check_out_date = ?, notes = ?, updated_at = ?, cancelled_at = ? WHERE id = ?`,
        [booking.status, booking.confirmationDepositAmountMinor, booking.guestName, booking.address, booking.cellphone, booking.email, booking.pax,
          booking.checkInDate, booking.checkOutDate, booking.notes, booking.updatedAt, booking.cancelledAt, booking.id],
      )
      if (lineItems) {
        await transaction.execute('DELETE FROM booking_line_items WHERE booking_id = ?', [booking.id])
        for (const item of lineItems) {
          await transaction.execute(
            `INSERT INTO booking_line_items (id, booking_id, kind, description, quantity, unit_amount_minor, total_amount_minor, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [item.id, item.bookingId, item.kind, item.description, item.quantity, item.unitAmountMinor, item.totalAmountMinor, item.createdAt],
          )
        }
      }
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

  async addPayment(payment: BookingPayment, activities: BookingActivity[], bookingUpdate?: Booking): Promise<void> {
    await this.client.transaction(async (transaction) => {
      await transaction.execute(
        `INSERT INTO payments (id, booking_id, kind, amount_minor, paid_at, method, transaction_reference, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [payment.id, payment.bookingId, payment.kind, payment.amountMinor, payment.paidAt, payment.method,
          payment.transactionReference, payment.notes, payment.createdAt],
      )
      if (bookingUpdate) {
        await transaction.execute('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?',
          [bookingUpdate.status, bookingUpdate.updatedAt, bookingUpdate.id])
      }
      for (const activity of activities) {
        await transaction.execute(
          `INSERT INTO booking_activity (id, booking_id, event_type, summary, details_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [activity.id, activity.bookingId, activity.eventType, activity.summary,
            activity.details === null ? null : JSON.stringify(activity.details), activity.createdAt],
        )
      }
    })
  }

  async replaceAll(records: BookingAggregate[]): Promise<void> {
    await this.client.transaction(async (transaction) => {
      await transaction.execute('DELETE FROM booking_activity')
      await transaction.execute('DELETE FROM payments')
      await transaction.execute('DELETE FROM booking_line_items')
      await transaction.execute('DELETE FROM bookings')
      for (const { booking, lineItems, payments, activity } of records) {
        await transaction.execute(
          `INSERT INTO bookings (${bookingColumns}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [booking.id, booking.status, booking.confirmationDepositAmountMinor, booking.guestName, booking.address, booking.cellphone, booking.email,
            booking.pax, booking.checkInDate, booking.checkOutDate, booking.notes, booking.createdAt,
            booking.updatedAt, booking.cancelledAt],
        )
        for (const item of lineItems) {
          await transaction.execute(
            `INSERT INTO booking_line_items (id, booking_id, kind, description, quantity, unit_amount_minor, total_amount_minor, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [item.id, item.bookingId, item.kind, item.description, item.quantity, item.unitAmountMinor, item.totalAmountMinor, item.createdAt],
          )
        }
        for (const payment of payments) {
          await transaction.execute(
            `INSERT INTO payments (id, booking_id, kind, amount_minor, paid_at, method, transaction_reference, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [payment.id, payment.bookingId, payment.kind, payment.amountMinor, payment.paidAt, payment.method,
              payment.transactionReference, payment.notes, payment.createdAt],
          )
        }
        for (const item of activity) {
          await transaction.execute(
            `INSERT INTO booking_activity (id, booking_id, event_type, summary, details_json, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [item.id, item.bookingId, item.eventType, item.summary, item.details === null ? null : JSON.stringify(item.details), item.createdAt],
          )
        }
      }
    })
  }
}
