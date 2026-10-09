import type { AppSettings } from '../../domain/models'
import type { BackupSnapshot, BackupStorage } from '../../application/services/BackupService'
import type { SqliteClient } from '../database/SqliteClient'
import { SqliteBookingRepository } from './sqlite/SqliteBookingRepository'
import { SqliteSettingsRepository } from './sqlite/SqliteSettingsRepository'
import { SettingsService } from '../../application/services/SettingsService'

const settingKeys: (keyof AppSettings)[] = [
  'displayName', 'propertyName', 'nightUseAmountMinor', 'additionalRoomAmountMinor', 'videokeRentalAmountMinor', 'confirmationDepositAmountMinor', 'currency',
]

export class SqliteBackupStorage implements BackupStorage {
  private readonly bookings: SqliteBookingRepository
  private readonly settings: SettingsService

  constructor(private readonly client: SqliteClient) {
    this.bookings = new SqliteBookingRepository(client)
    this.settings = new SettingsService(new SqliteSettingsRepository(client))
  }

  async load(): Promise<BackupSnapshot> {
    const [settings, bookings] = await Promise.all([this.settings.load(), this.bookings.listAll()])
    return { settings, bookings }
  }

  async replace(snapshot: BackupSnapshot): Promise<void> {
    await this.client.transaction(async (transaction) => {
      for (const table of ['booking_activity', 'payments', 'booking_line_items', 'bookings', 'app_settings']) {
        await transaction.execute(`DELETE FROM ${table}`)
      }
      const timestamp = new Date().toISOString()
      for (const key of settingKeys) {
        await transaction.execute('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)', [key, String(snapshot.settings[key]), timestamp])
      }
      for (const { booking, lineItems, payments, activity } of snapshot.bookings) {
        await transaction.execute(
          `INSERT INTO bookings (id, status, confirmation_deposit_amount_minor, guest_name, address, cellphone, email, pax, check_in_date, check_out_date, notes, created_at, updated_at, cancelled_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [booking.id, booking.status, booking.confirmationDepositAmountMinor, booking.guestName, booking.address, booking.cellphone, booking.email, booking.pax,
            booking.checkInDate, booking.checkOutDate, booking.notes, booking.createdAt, booking.updatedAt, booking.cancelledAt],
        )
        for (const item of lineItems) await transaction.execute(
          `INSERT INTO booking_line_items (id, booking_id, kind, description, quantity, unit_amount_minor, total_amount_minor, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [item.id, item.bookingId, item.kind, item.description, item.quantity, item.unitAmountMinor, item.totalAmountMinor, item.createdAt],
        )
        for (const payment of payments) await transaction.execute(
          `INSERT INTO payments (id, booking_id, kind, amount_minor, paid_at, method, transaction_reference, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [payment.id, payment.bookingId, payment.kind, payment.amountMinor, payment.paidAt, payment.method,
            payment.transactionReference, payment.notes, payment.createdAt],
        )
        for (const event of activity) await transaction.execute(
          `INSERT INTO booking_activity (id, booking_id, event_type, summary, details_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [event.id, event.bookingId, event.eventType, event.summary, event.details === null ? null : JSON.stringify(event.details), event.createdAt],
        )
      }
    })
  }
}
