import migration from '../drizzle/0000_wandering_bulldozer.sql'
import { CreateBookingService } from '../src/application/services/CreateBookingService'
import { SqliteBookingRepository } from '../src/data/repositories/sqlite/SqliteBookingRepository'
import type { UUID } from '../src/domain/models'
import { createMemorySqlite } from './support/memorySqlite'

describe('booking creation pricing snapshot', () => {
  it('persists guest details and the exact price breakdown for later reference', async () => {
    const { database, client } = await createMemorySqlite(migration)
    let idCounter = 0
    const service = new CreateBookingService(new SqliteBookingRepository(client), {
      createId: () => `00000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID,
      now: () => '2026-10-07T10:00:00.000Z',
    })

    try {
      const created = await service.create({
        booking: {
          guestName: '  Maria Santos ',
          address: 'San Juan, La Union',
          cellphone: '09171234567',
          email: '',
          pax: 16,
          checkInDate: '2026-11-10',
          checkOutDate: '2026-11-11',
          notes: '',
        },
        pricing: {
          rentVideokeWithOneRoom: true,
          customItems: [
            { kind: 'custom_charge', description: 'Catering', quantity: 1, amountMinor: 40000 },
            { kind: 'discount', description: 'Returning guest discount', quantity: 1, amountMinor: 20000 },
          ],
        },
      })
      const saved = await new SqliteBookingRepository(client).findById(created.booking.id)

      expect(saved?.booking.guestName).toBe('Maria Santos')
      expect(saved?.booking.address).toBe('San Juan, La Union')
      expect(saved?.booking.pax).toBe(16)
      expect(saved?.lineItems.map(({ kind, totalAmountMinor }) => [kind, totalAmountMinor])).toEqual([
        ['base_package', 590000],
        ['included_room', 0],
        ['videoke', 80000],
        ['custom_charge', 40000],
        ['discount', -20000],
      ])
      expect(saved?.lineItems.reduce((total, item) => total + item.totalAmountMinor, 0)).toBe(690000)
      expect(saved?.activity[0].details).toEqual({
        status: 'tentative',
        confirmationDepositAmountMinor: 100000,
        checkInDate: '2026-11-10',
        checkOutDate: '2026-11-11',
        totalAmountMinor: 690000,
      })
    } finally {
      database.close()
    }
  })
})
