import migration from '../drizzle/0000_wandering_bulldozer.sql'
import { CreateBookingService } from '../src/application/services/CreateBookingService'
import { SqliteBookingRepository } from '../src/data/repositories/sqlite/SqliteBookingRepository'
import type { UUID } from '../src/domain/models'
import { createMemorySqlite } from './support/memorySqlite'

describe('booking overlap warning query', () => {
  it('finds intersecting active date ranges and respects exclusive check-out dates', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const repository = new SqliteBookingRepository(client)
    let idCounter = 0
    const createService = new CreateBookingService(repository, {
      createId: () => `30000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID,
      now: () => '2026-10-07T10:00:00.000Z',
    })

    try {
      const original = await createService.create({
        booking: {
          guestName: 'Existing stay', cellphone: '09171234567',
          checkInDate: '2026-12-01', checkOutDate: '2026-12-03',
        },
        pricing: {},
      })

      expect(await repository.findOverlaps('2026-12-02', '2026-12-04')).toHaveLength(1)
      expect(await repository.findOverlaps('2026-12-03', '2026-12-04')).toHaveLength(0)

      await repository.update({ ...original.booking, status: 'cancelled', cancelledAt: '2026-10-08T10:00:00.000Z' })
      expect(await repository.findOverlaps('2026-12-02', '2026-12-04')).toHaveLength(0)
    } finally {
      database.close()
    }
  })
})
