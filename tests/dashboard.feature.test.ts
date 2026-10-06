import migration from '../drizzle/0000_wandering_bulldozer.sql'
import { CreateBookingService } from '../src/application/services/CreateBookingService'
import { DashboardService } from '../src/application/services/DashboardService'
import { SqliteDashboardRepository } from '../src/data/repositories/sqlite/SqliteDashboardRepository'
import { SqliteBookingRepository } from '../src/data/repositories/sqlite/SqliteBookingRepository'
import type { UUID } from '../src/domain/models'
import { createMemorySqlite } from './support/memorySqlite'

describe('dashboard summary feature', () => {
  it('reads upcoming stays, balances, and referenced payments from local SQLite', async () => {
    const { database, client } = await createMemorySqlite(migration)
    let idCounter = 0
    const bookingRepository = new SqliteBookingRepository(client)
    const created = await new CreateBookingService(bookingRepository, {
      createId: () => `20000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID,
      now: () => '2026-10-07T10:00:00.000Z',
    }).create({
      booking: {
        guestName: 'Dashboard guest',
        cellphone: '09171234567',
        pax: 6,
        checkInDate: '2026-11-10',
        checkOutDate: '2026-11-11',
      },
      pricing: {},
    })

    try {
      await client.execute(
        `INSERT INTO payments (id, booking_id, kind, amount_minor, paid_at, method, transaction_reference, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['20000000-0000-4000-8000-000000000008', created.booking.id, 'payment', 200000,
          '2026-10-07', 'GCash', 'GC-90812', '2026-10-07T10:00:00.000Z'],
      )
      const summary = await new DashboardService(new SqliteDashboardRepository(client)).load('2026-10-07')

      expect(summary.bookingCount).toBe(1)
      expect(summary.upcomingCount).toBe(1)
      expect(summary.upcomingBookings[0]).toMatchObject({
        guestName: 'Dashboard guest',
        balanceDueMinor: 390000,
      })
      expect(summary.totalBalanceDueMinor).toBe(390000)
      expect(summary.recentPayments[0]).toMatchObject({
        guestName: 'Dashboard guest',
        amountMinor: 200000,
        transactionReference: 'GC-90812',
      })
    } finally {
      database.close()
    }
  })
})
