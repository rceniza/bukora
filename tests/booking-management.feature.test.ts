import migration from '../drizzle/0000_wandering_bulldozer.sql'
import { BookingManagementService } from '../src/application/services/BookingManagementService'
import { PaymentService } from '../src/application/services/PaymentService'
import { CreateBookingService } from '../src/application/services/CreateBookingService'
import { SqliteBookingRepository } from '../src/data/repositories/sqlite/SqliteBookingRepository'
import type { UUID } from '../src/domain/models'
import { createMemorySqlite } from './support/memorySqlite'

describe('booking management history feature', () => {
  it('edits rooms, videoke, charges, and discounts while preserving payments and price history', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const repository = new SqliteBookingRepository(client)
    let idCounter = 0
    let instant = '2026-10-07T10:00:00.000Z'
    const createId = () => `70000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID
    const creator = new CreateBookingService(repository, { createId, now: () => instant })
    const management = new BookingManagementService(repository, createId, () => instant)
    const payments = new PaymentService(repository, createId, () => instant)
    try {
      const created = await creator.create({ booking: { guestName: 'Lina Cruz', cellphone: '09171234567', checkInDate: '2026-12-01', checkOutDate: '2026-12-02' }, pricing: {} })
      const recorded = await payments.record(created.booking.id, { kind: 'payment', amountMinor: 100000, paidAt: '2026-10-07', method: 'GCash', transactionReference: 'DP-ROOMS-1' })
      instant = '2026-10-08T10:00:00.000Z'
      await management.updateDetails(created.booking.id, {
        guestName: 'Lina Cruz', cellphone: '09171234567', checkInDate: '2026-12-01', checkOutDate: '2026-12-02',
      }, {
        options: { includeSecondRoom: true, customItems: [
          { kind: 'custom_charge', description: 'Catering', quantity: 1, amountMinor: 50000 },
          { kind: 'discount', description: 'Courtesy discount', quantity: 1, amountMinor: 20000 },
        ] },
        rates: { nightUseAmountMinor: 590000, additionalRoomAmountMinor: 180000, videokeRentalAmountMinor: 80000 },
      })

      const saved = await repository.findById(created.booking.id)
      expect(saved?.lineItems.map(({ kind, description, totalAmountMinor }) => [kind, description, totalAmountMinor])).toEqual([
        ['base_package', 'Night use', 590000], ['included_room', 'One room included', 0],
        ['additional_room', 'Second room', 180000], ['videoke', 'Videoke included with second room', 0],
        ['custom_charge', 'Catering', 50000], ['discount', 'Courtesy discount', -20000],
      ])
      expect(saved?.payments).toEqual(recorded.payments)
      expect(saved?.activity.at(-1)).toMatchObject({
        eventType: 'booking_updated',
        details: {
          previous: { totalAmountMinor: 590000 },
          next: { totalAmountMinor: 800000 },
        },
      })
    } finally { database.close() }
  })

  it('reschedules and cancels a booking while retaining each change in its activity trail', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const repository = new SqliteBookingRepository(client)
    let idCounter = 0
    let instant = '2026-10-07T10:00:00.000Z'
    const dependencies = {
      createId: () => `50000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID,
      now: () => instant,
    }
    const creator = new CreateBookingService(repository, dependencies)
    const management = new BookingManagementService(repository, dependencies.createId, dependencies.now)
    try {
      const created = await creator.create({
        booking: { guestName: 'Lina Cruz', cellphone: '09171234567', checkInDate: '2026-12-01', checkOutDate: '2026-12-02' },
        pricing: {},
      })
      instant = '2026-10-08T09:00:00.000Z'
      await management.updateDetails(created.booking.id, {
        guestName: 'Lina Cruz', cellphone: '09171234567', address: 'San Juan, La Union',
        checkInDate: '2026-12-03', checkOutDate: '2026-12-04',
      })
      instant = '2026-10-09T09:00:00.000Z'
      await management.cancel(created.booking.id, 'Guest requested cancellation')

      const saved = await repository.findById(created.booking.id)
      expect(saved?.booking.status).toBe('cancelled')
      expect(saved?.booking.cancelledAt).toBe(instant)
      expect(saved?.activity.map(({ eventType }) => eventType)).toEqual([
        'booking_created', 'booking_rescheduled', 'booking_cancelled',
      ])
      expect(saved?.activity[1].details).toMatchObject({
        previous: { checkInDate: '2026-12-01', checkOutDate: '2026-12-02' },
        next: { checkInDate: '2026-12-03', checkOutDate: '2026-12-04' },
      })
      expect(saved?.activity[2].details).toMatchObject({ reason: 'Guest requested cancellation' })
    } finally { database.close() }
  })

  it('rejects a reschedule that overlaps another active stay', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const repository = new SqliteBookingRepository(client)
    let idCounter = 0
    const dependencies = {
      createId: () => `60000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID,
      now: () => '2026-10-07T10:00:00.000Z',
    }
    const creator = new CreateBookingService(repository, dependencies)
    const management = new BookingManagementService(repository, dependencies.createId, dependencies.now)
    try {
      const first = await creator.create({ booking: { guestName: 'First', cellphone: '09171234567', checkInDate: '2026-12-01', checkOutDate: '2026-12-03' }, pricing: {} })
      const second = await creator.create({ booking: { guestName: 'Second', cellphone: '09171234567', checkInDate: '2026-12-05', checkOutDate: '2026-12-06' }, pricing: {} })
      await expect(management.updateDetails(second.booking.id, {
        guestName: 'Second', cellphone: '09171234567', checkInDate: '2026-12-02', checkOutDate: '2026-12-04',
      })).rejects.toThrow('These dates overlap another active booking.')
      expect((await repository.findById(first.booking.id))?.booking.checkInDate).toBe('2026-12-01')
      expect((await repository.findById(second.booking.id))?.activity).toHaveLength(1)
    } finally { database.close() }
  })
})
