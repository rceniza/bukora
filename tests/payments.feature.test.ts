import migration from '../drizzle/0000_wandering_bulldozer.sql'
import { CreateBookingService } from '../src/application/services/CreateBookingService'
import { PaymentService } from '../src/application/services/PaymentService'
import { SqliteBookingRepository } from '../src/data/repositories/sqlite/SqliteBookingRepository'
import { calculateBalanceDueMinor } from '../src/domain/services/bookingBalance'
import type { UUID } from '../src/domain/models'
import { createMemorySqlite } from './support/memorySqlite'

describe('payment tracking feature', () => {
  it('records a deposit, a later payment, and a refund with references in booking history', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const repository = new SqliteBookingRepository(client)
    let idCounter = 0
    const createId = () => `70000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID
    const now = () => `2026-10-0${Math.min(idCounter, 9)}T10:00:00.000Z`
    const booking = await new CreateBookingService(repository, { createId, now }).create({
      booking: { guestName: 'Nico Reyes', cellphone: '09171234567', checkInDate: '2026-11-01', checkOutDate: '2026-11-02' },
      pricing: {},
    })
    const payments = new PaymentService(repository, createId, now)
    try {
      await payments.record(booking.booking.id, {
        kind: 'payment', amountMinor: 200000, paidAt: '2026-10-07', method: 'GCash', transactionReference: 'GC-DEP-1042',
      })
      await payments.record(booking.booking.id, {
        kind: 'payment', amountMinor: 150000, paidAt: '2026-10-08', method: 'Cash', transactionReference: 'CASH-02', notes: 'Second installment',
      })
      await payments.record(booking.booking.id, {
        kind: 'refund', amountMinor: 50000, paidAt: '2026-10-09', method: 'GCash', transactionReference: 'GC-REF-17',
      })

      const saved = await repository.findById(booking.booking.id)
      expect(saved?.payments.map(({ kind, amountMinor, transactionReference }) => [kind, amountMinor, transactionReference])).toEqual([
        ['payment', 200000, 'GC-DEP-1042'], ['payment', 150000, 'CASH-02'], ['refund', 50000, 'GC-REF-17'],
      ])
      expect(calculateBalanceDueMinor(saved!.lineItems, saved!.payments)).toBe(290000)
      expect(saved?.activity.map(({ eventType }) => eventType)).toEqual([
        'booking_created', 'payment_recorded', 'payment_recorded', 'payment_refunded',
      ])
      expect(saved?.activity[1].details).toMatchObject({ transactionReference: 'GC-DEP-1042', amountMinor: 200000 })
    } finally { database.close() }
  })

  it('rejects a refund larger than the net amount received', async () => {
    const { database, client } = await createMemorySqlite(migration)
    const repository = new SqliteBookingRepository(client)
    let idCounter = 0
    const createId = () => `80000000-0000-4000-8000-${String(++idCounter).padStart(12, '0')}` as UUID
    const created = await new CreateBookingService(repository, { createId }).create({
      booking: { guestName: 'Mia Cruz', cellphone: '09171234567', checkInDate: '2026-11-01', checkOutDate: '2026-11-02' },
      pricing: {},
    })
    const service = new PaymentService(repository, createId)
    try {
      await service.record(created.booking.id, { kind: 'payment', amountMinor: 30000, paidAt: '2026-10-07', method: 'Cash' })
      await expect(service.record(created.booking.id, { kind: 'refund', amountMinor: 30001, paidAt: '2026-10-08', method: 'Cash' }))
        .rejects.toThrow('Refund cannot exceed the amount paid so far.')
      expect((await repository.findById(created.booking.id))?.payments).toHaveLength(1)
    } finally { database.close() }
  })
})
