import migration from '../drizzle/0000_wandering_bulldozer.sql'
import { createMemorySqlite, type MemorySqliteClient } from './support/memorySqlite'
import { SqliteBookingRepository } from '../src/data/repositories/sqlite/SqliteBookingRepository'
import { SqliteSettingsRepository } from '../src/data/repositories/sqlite/SqliteSettingsRepository'
import type { Booking, BookingActivity, BookingId, BookingLineItem, UUID } from '../src/domain/models'

const bookingId = 'b3d73b08-7d4c-4ecf-b5f4-62da231ad718' as BookingId
const now = '2026-10-07T10:00:00.000Z'

function makeBooking(): Booking {
  return {
    id: bookingId,
    status: 'confirmed',
    guestName: 'Maria Santos',
    address: 'San Juan, La Union',
    cellphone: '09171234567',
    email: null,
    pax: 8,
    checkInDate: '2026-11-10',
    checkOutDate: '2026-11-11',
    notes: null,
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
  }
}

function makeLineItem(id: string, kind: BookingLineItem['kind'], amount: number): BookingLineItem {
  return {
    id: id as UUID,
    bookingId,
    kind,
    description: kind === 'base_package' ? 'Night use' : 'Second room',
    quantity: 1,
    unitAmountMinor: amount,
    totalAmountMinor: amount,
    createdAt: now,
  }
}

function makeActivity(): BookingActivity {
  return {
    id: 'c3d73b08-7d4c-4ecf-b5f4-62da231ad719' as UUID,
    bookingId,
    eventType: 'booking_created',
    summary: 'Booking created',
    details: { source: 'test' },
    createdAt: now,
  }
}

describe('SQLite repositories and schema migration', () => {
  let database: import('sql.js').Database
  let client: MemorySqliteClient

  beforeEach(async () => {
    const initialized = await createMemorySqlite(migration)
    database = initialized.database
    client = initialized.client
  })

  afterEach(() => database.close())

  it('creates and reads a booking aggregate atomically and updates its guest record', async () => {
    const repository = new SqliteBookingRepository(client)
    const booking = makeBooking()
    const items = [makeLineItem('d3d73b08-7d4c-4ecf-b5f4-62da231ad720', 'base_package', 590000)]

    await repository.create({ booking, lineItems: items, initialActivity: makeActivity() })
    let aggregate = await repository.findById(bookingId)

    expect(aggregate?.booking.guestName).toBe('Maria Santos')
    expect(aggregate?.lineItems).toEqual(items)
    expect(aggregate?.activity[0].details).toEqual({ source: 'test' })

    await repository.update({ ...booking, guestName: 'Maria Reyes', updatedAt: '2026-10-08T10:00:00.000Z' })
    aggregate = await repository.findById(bookingId)
    expect(aggregate?.booking.guestName).toBe('Maria Reyes')
    expect(await repository.findById('e3d73b08-7d4c-4ecf-b5f4-62da231ad721' as BookingId)).toBeNull()
  })

  it('rolls back partial booking inserts and enforces foreign keys and date constraints', async () => {
    const repository = new SqliteBookingRepository(client)
    const booking = makeBooking()

    await expect(repository.create({
      booking,
      lineItems: [makeLineItem('f3d73b08-7d4c-4ecf-b5f4-62da231ad722', 'base_package', 590000), {
        ...makeLineItem('a3d73b08-7d4c-4ecf-b5f4-62da231ad723', 'discount', 100),
        totalAmountMinor: 100,
      }],
      initialActivity: makeActivity(),
    })).rejects.toThrow()

    expect(await repository.findById(bookingId)).toBeNull()
    expect(() => database.run('INSERT INTO payments (id, booking_id, kind, amount_minor, paid_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ['f3d73b08-7d4c-4ecf-b5f4-62da231ad724', bookingId, 'payment', 100, now, now])).toThrow()
    expect(() => database.run(`INSERT INTO bookings (id, guest_name, cellphone, pax, check_in_date, check_out_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['f3d73b08-7d4c-4ecf-b5f4-62da231ad725', 'Invalid dates', '09170000000', 1, '2026-11-11', '2026-11-10', now, now]))
      .toThrow()
  })

  it('upserts owner settings and returns the latest value', async () => {
    const repository = new SqliteSettingsRepository(client)
    await repository.set({ key: 'display_name', value: 'Bukora', updatedAt: now })
    await repository.set({ key: 'display_name', value: 'Cenere Bookings', updatedAt: '2026-10-08T10:00:00.000Z' })

    expect(await repository.get('display_name')).toEqual({
      key: 'display_name',
      value: 'Cenere Bookings',
      updatedAt: '2026-10-08T10:00:00.000Z',
    })
  })
})
