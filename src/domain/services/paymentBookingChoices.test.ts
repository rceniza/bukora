import type { BookingAggregate } from '../ports/BookingRepository'
import type { BookingId } from '../models'
import { selectPaymentBookingChoices } from './paymentBookingChoices'

function booking(index: number, checkInDate: string, status: 'tentative' | 'confirmed' | 'cancelled' | 'completed' = 'confirmed'): BookingAggregate {
  return {
    booking: {
      id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` as BookingId,
      guestName: `Guest ${index + 1}`, cellphone: `+6391700000${String(index).padStart(2, '0')}`,
      address: null, email: null, checkInDate, checkOutDate: checkInDate, notes: null, pax: 2, status,
      confirmationDepositAmountMinor: 100000, createdAt: '', updatedAt: '', cancelledAt: null,
    }, lineItems: [], payments: [], activity: [],
  }
}

describe('selectPaymentBookingChoices', () => {
  it('shows the five closest upcoming stays and excludes cancelled, completed, and past stays', () => {
    const records = [
      booking(0, '2026-10-16'), booking(1, '2026-10-14'), booking(2, '2026-10-12'),
      booking(3, '2026-10-15'), booking(4, '2026-10-13'), booking(5, '2026-10-17'),
      booking(6, '2026-10-13', 'cancelled'), booking(7, '2026-10-13', 'completed'), booking(8, '2026-10-11'),
    ]
    const result = selectPaymentBookingChoices(records, '', '2026-10-12')

    expect(result.items.map(({ booking: item }) => item.guestName)).toEqual(['Guest 3', 'Guest 5', 'Guest 2', 'Guest 4', 'Guest 1'])
    expect(result).toMatchObject({ total: 6, searching: false })
  })

  it('searches all history by name, phone number, or check-in date', () => {
    const records = [booking(0, '2025-07-01'), booking(1, '2025-07-02', 'cancelled')]

    expect(selectPaymentBookingChoices(records, 'guest 1', '2026-10-12').items).toHaveLength(1)
    expect(selectPaymentBookingChoices(records, '+639170000001', '2026-10-12').items[0].booking.guestName).toBe('Guest 2')
    expect(selectPaymentBookingChoices(records, '2025-07-01', '2026-10-12').items[0].booking.guestName).toBe('Guest 1')
    expect(selectPaymentBookingChoices(records, ' guest ', '2026-10-12')).toMatchObject({ total: 2, searching: true })
  })

  it('caps a large search result list without hiding its full result count', () => {
    const records = Array.from({ length: 25 }, (_, index) => booking(index, '2027-01-01'))
    const result = selectPaymentBookingChoices(records, 'guest', '2026-10-12')

    expect(result.items).toHaveLength(20)
    expect(result.total).toBe(25)
  })
})
