import { BookingManagementService } from './BookingManagementService'
import type { Booking, BookingActivity, BookingLineItem, BookingPayment, UUID } from '../../domain/models'
import type { BookingRepository } from '../../domain/ports/BookingRepository'
import { calculateBookingQuote } from '../../domain/services/bookingQuote'

const booking = {
  id: '10000000-0000-4000-8000-000000000001' as UUID, status: 'confirmed', confirmationDepositAmountMinor: 100000,
  guestName: 'Lina Cruz', address: null, cellphone: '+639171234567', email: null, pax: 0,
  checkInDate: '2026-12-01', checkOutDate: '2026-12-02', notes: null,
  createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', cancelledAt: null,
} satisfies Booking

function makeRecord(lineItems = toLineItems(calculateBookingQuote({}).lineItems)) {
  return { booking, lineItems, payments: [{
    id: '20000000-0000-4000-8000-000000000001' as UUID, bookingId: booking.id, kind: 'payment', amountMinor: 100000,
    paidAt: '2026-10-01', method: 'Cash', transactionReference: 'DP-1', notes: null, createdAt: booking.createdAt,
  } satisfies BookingPayment], activity: [] as BookingActivity[] }
}

function toLineItems(items: ReturnType<typeof calculateBookingQuote>['lineItems']): BookingLineItem[] {
  return items.map((item, index) => ({ ...item, id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` as UUID, bookingId: booking.id, createdAt: booking.createdAt }))
}

const details = {
  guestName: 'Lina Cruz', cellphone: '+639171234567', checkInDate: '2026-12-01', checkOutDate: '2026-12-02',
}

describe('BookingManagementService pricing edits', () => {
  it('recalculates room, videoke, charges, and discounts and records both price snapshots', async () => {
    const current = makeRecord()
    const repository = {
      findById: jest.fn().mockResolvedValue(current), findOverlaps: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue(undefined),
    } as unknown as BookingRepository
    let id = 0
    const service = new BookingManagementService(repository, () => `40000000-0000-4000-8000-${String(++id).padStart(12, '0')}` as UUID, () => '2026-10-02T10:00:00.000Z')

    const result = await service.updateDetails(booking.id as never, details, {
      options: { includeSecondRoom: true, customItems: [
        { kind: 'custom_charge', description: 'Catering', amountMinor: 50000, quantity: 1 },
        { kind: 'discount', description: 'Courtesy discount', amountMinor: 20000, quantity: 1 },
      ] },
      rates: { nightUseAmountMinor: 590000, additionalRoomAmountMinor: 180000, videokeRentalAmountMinor: 80000 },
    })

    expect(result.lineItems.map(({ kind, description, totalAmountMinor }) => [kind, description, totalAmountMinor])).toEqual([
      ['base_package', 'Night use', 590000], ['included_room', 'One room included', 0],
      ['additional_room', 'Second room', 180000], ['videoke', 'Videoke included with second room', 0],
      ['custom_charge', 'Catering', 50000], ['discount', 'Courtesy discount', -20000],
    ])
    expect(result.payments).toEqual(current.payments)
    expect(result.activity[0].details).toMatchObject({
      previous: { totalAmountMinor: 590000 },
      next: { totalAmountMinor: 800000, lineItems: expect.arrayContaining([expect.objectContaining({ description: 'Catering', totalAmountMinor: 50000 })]) },
    })
    expect(jest.mocked(repository.update)).toHaveBeenCalledWith(result.booking, result.activity[0], result.lineItems)
  })

  it('rejects discounts above the current quote without writing changes', async () => {
    const repository = { findById: jest.fn().mockResolvedValue(makeRecord()), findOverlaps: jest.fn().mockResolvedValue([]), update: jest.fn() } as unknown as BookingRepository
    const service = new BookingManagementService(repository)
    await expect(service.updateDetails(booking.id as never, details, {
      options: { customItems: [{ kind: 'discount', description: 'Too much', amountMinor: 600000, quantity: 1 }] },
      rates: { nightUseAmountMinor: 590000, additionalRoomAmountMinor: 180000, videokeRentalAmountMinor: 80000 },
    })).rejects.toThrow('The booking total must be a nonnegative safe integer.')
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('adds the videoke rental to a one-room booking when the owner enables it', async () => {
    const repository = { findById: jest.fn().mockResolvedValue(makeRecord()), findOverlaps: jest.fn().mockResolvedValue([]), update: jest.fn() } as unknown as BookingRepository
    const service = new BookingManagementService(repository)
    const result = await service.updateDetails(booking.id as never, details, {
      options: { rentVideokeWithOneRoom: true },
      rates: { nightUseAmountMinor: 590000, additionalRoomAmountMinor: 180000, videokeRentalAmountMinor: 80000 },
    })

    expect(result.lineItems.find(({ kind }) => kind === 'videoke')).toMatchObject({ description: 'Videoke rental', totalAmountMinor: 80000 })
    expect(result.activity[0].details).toMatchObject({ previous: { totalAmountMinor: 590000 }, next: { totalAmountMinor: 670000 } })
  })
})
