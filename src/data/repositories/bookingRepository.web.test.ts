import type { BookingAggregate } from '../../domain/ports/BookingRepository'
import type { BookingId } from '../../domain/models'
import { LocalStorageBookingRepository } from './bookingRepository.web'

const STORAGE_KEY = 'bukora.bookings'

function makeBooking(index: number, date: string, status: 'tentative' | 'confirmed' | 'cancelled'): BookingAggregate {
  return {
    booking: {
      id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` as BookingId,
      guestName: `Guest ${index + 1}`, cellphone: `+6391700000${String(index).padStart(2, '0')}`,
      address: null, email: index === 1 ? 'guest@example.com' : null, checkInDate: date, checkOutDate: date,
      notes: null, pax: 2, status, confirmationDepositAmountMinor: 100000,
      createdAt: `2026-10-0${index + 1}T10:00:00.000Z`, updatedAt: '', cancelledAt: null,
    }, lineItems: [], payments: [], activity: [],
  }
}

describe('LocalStorageBookingRepository.listPage', () => {
  const storage = new Map<string, string>()
  beforeAll(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => { storage.set(key, value) },
        removeItem: (key: string) => { storage.delete(key) },
        clear: () => storage.clear(),
      },
    })
  })
  beforeEach(() => storage.clear())

  it('keeps cursor ordering, filters, and search consistent with the SQLite implementation', async () => {
    const all = [makeBooking(0, '2026-12-03', 'confirmed'), makeBooking(1, '2026-12-01', 'tentative'), makeBooking(2, '2026-12-02', 'cancelled')]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    const repository = new LocalStorageBookingRepository()

    const first = await repository.listPage({ filter: 'all', query: '', today: '2026-12-01', limit: 1 })
    expect(first.records[0].booking.guestName).toBe('Guest 2')
    expect(first.hasMore).toBe(true)
    const second = await repository.listPage({ filter: 'all', query: '', today: '2026-12-01', limit: 1, cursor: first.nextCursor })
    expect(second.records[0].booking.guestName).toBe('Guest 3')
    expect(second.hasMore).toBe(true)

    const filtered = await repository.listPage({ filter: 'upcoming', query: 'guest@example', today: '2026-12-01', limit: 20 })
    expect(filtered.records.map(({ booking }) => booking.guestName)).toEqual(['Guest 2'])
    const cancelled = await repository.listPage({ filter: 'cancelled', query: '', today: '2026-12-01', limit: 20 })
    expect(cancelled.records.map(({ booking }) => booking.guestName)).toEqual(['Guest 3'])
  })
})
