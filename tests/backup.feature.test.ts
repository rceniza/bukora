import migration from '../drizzle/0000_wandering_bulldozer.sql'
import { BackupService } from '../src/application/services/BackupService'
import { CreateBookingService } from '../src/application/services/CreateBookingService'
import { SettingsService } from '../src/application/services/SettingsService'
import { SqliteSettingsRepository } from '../src/data/repositories/sqlite/SqliteSettingsRepository'
import { SqliteBackupStorage } from '../src/data/repositories/SqliteBackupStorage'
import { SqliteBookingRepository } from '../src/data/repositories/sqlite/SqliteBookingRepository'
import { DEFAULT_APP_SETTINGS } from '../src/domain/models/defaults'
import type { UUID } from '../src/domain/models'
import { createMemorySqlite } from './support/memorySqlite'

describe('versioned local backup feature', () => {
  it('exports and restores settings, bookings, price details, payments, and activity together', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const storage = new SqliteBackupStorage(client)
    const bookingRepository = new SqliteBookingRepository(client)
    const settings = new SettingsService(new SqliteSettingsRepository(client), () => '2026-10-07T10:00:00.000Z')
    let idCounter = 0
    const createId = () => `90000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID
    const createBooking = new CreateBookingService(bookingRepository, { createId, now: () => '2026-10-07T10:00:00.000Z' })
    const backup = new BackupService(storage, () => '2026-10-07T10:00:00.000Z')
    try {
      await settings.save({ ...DEFAULT_APP_SETTINGS, displayName: 'Cenere Bookings', additionalRoomAmountMinor: 200000 })
      const first = await createBooking.create({
        booking: { guestName: 'Backup Guest', cellphone: '09171234567', checkInDate: '2026-11-01', checkOutDate: '2026-11-02' },
        pricing: { customItems: [{ kind: 'custom_charge', description: 'Catering', quantity: 1, amountMinor: 50000 }] },
      })
      await bookingRepository.addPayment({
        id: createId(), bookingId: first.booking.id, kind: 'payment', amountMinor: 100000, paidAt: '2026-10-07',
        method: 'GCash', transactionReference: 'BACKUP-REF', notes: null, createdAt: '2026-10-07T10:00:00.000Z',
      }, {
        id: createId(), bookingId: first.booking.id, eventType: 'payment_recorded', summary: 'Deposit received',
        details: { transactionReference: 'BACKUP-REF' }, createdAt: '2026-10-07T10:00:00.000Z',
      })

      const exported = await backup.export()
      const preview = backup.parse(exported)
      await createBooking.create({
        booking: { guestName: 'Temporary Guest', cellphone: '09171234568', checkInDate: '2026-11-03', checkOutDate: '2026-11-04' },
        pricing: {},
      })
      await settings.save(DEFAULT_APP_SETTINGS)
      await backup.restore(preview)

      const restored = await storage.load()
      expect(restored.settings.displayName).toBe('Cenere Bookings')
      expect(restored.settings.additionalRoomAmountMinor).toBe(200000)
      expect(restored.bookings).toHaveLength(1)
      expect(restored.bookings[0].booking.guestName).toBe('Backup Guest')
      expect(restored.bookings[0].payments[0].transactionReference).toBe('BACKUP-REF')
      expect(restored.bookings[0].activity.map(({ eventType }) => eventType)).toEqual(['booking_created', 'payment_recorded'])
      expect(restored.bookings[0].lineItems.map(({ description }) => description)).toContain('Catering')
    } finally { database.close() }
  })

  it('rejects invalid, corrupt, and unsupported backups before touching current data', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const storage = new SqliteBackupStorage(client)
    const backup = new BackupService(storage)
    const repository = new SqliteBookingRepository(client)
    let idCounter = 0
    const createBooking = new CreateBookingService(repository, {
      createId: () => `a0000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID,
      now: () => '2026-10-07T10:00:00.000Z',
    })
    try {
      await createBooking.create({ booking: { guestName: 'Keep This', cellphone: '09171234567', checkInDate: '2026-11-01', checkOutDate: '2026-11-02' }, pricing: {} })
      expect(() => backup.parse('{broken')).toThrow('This file is not valid JSON.')
      expect(() => backup.parse(JSON.stringify({ format: 'bukora-backup', version: 17 }))).toThrow('Backup version 17 is not supported.')
      expect(() => backup.parse(JSON.stringify({ format: 'bukora-backup', version: 1, bookings: [] })))
        .toThrow('This backup is invalid or incomplete. Your current records have not been changed.')
      const tampered = JSON.parse(await backup.export()) as { bookings: { lineItems: { totalAmountMinor: number }[] }[] }
      tampered.bookings[0].lineItems[0].totalAmountMinor += 1
      expect(() => backup.parse(JSON.stringify(tampered)))
        .toThrow('This backup is invalid or incomplete. Your current records have not been changed.')
      expect((await repository.listAll()).map(({ booking }) => booking.guestName)).toEqual(['Keep This'])
    } finally { database.close() }
  })
})
