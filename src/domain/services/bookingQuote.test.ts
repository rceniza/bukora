import { calculateBookingQuote } from './bookingQuote'

describe('calculateBookingQuote', () => {
  it('prices the base night-use package with one included room', () => {
    const quote = calculateBookingQuote({})

    expect(quote.totalAmountMinor).toBe(590000)
    expect(quote.lineItems.map(({ kind, totalAmountMinor }) => [kind, totalAmountMinor])).toEqual([
      ['base_package', 590000],
      ['included_room', 0],
    ])
  })

  it('adds the second room and records the included videoke without charging for either benefit twice', () => {
    const quote = calculateBookingQuote({ includeSecondRoom: true })

    expect(quote.totalAmountMinor).toBe(770000)
    expect(quote.lineItems.slice(-2).map(({ kind, totalAmountMinor }) => [kind, totalAmountMinor])).toEqual([
      ['additional_room', 180000],
      ['videoke', 0],
    ])
  })

  it('adds videoke rental for one room and applies custom charges and discounts', () => {
    const quote = calculateBookingQuote({
      rentVideokeWithOneRoom: true,
      customItems: [
        { kind: 'custom_charge', description: 'Catering', quantity: 2, amountMinor: 50000 },
        { kind: 'discount', description: 'Returning guest', quantity: 1, amountMinor: 25000 },
      ],
    })

    expect(quote.totalAmountMinor).toBe(745000)
    expect(quote.lineItems.slice(-2).map(({ totalAmountMinor }) => totalAmountMinor)).toEqual([100000, -25000])
  })

  it('rejects videoke rental with the second room and discounts above the package total', () => {
    expect(() => calculateBookingQuote({ includeSecondRoom: true, rentVideokeWithOneRoom: true })).toThrow()
    expect(() => calculateBookingQuote({
      customItems: [{ kind: 'discount', description: 'Full discount', quantity: 1, amountMinor: 590001 }],
    })).toThrow(RangeError)
  })

  it('rejects invalid configurable rates', () => {
    expect(() => calculateBookingQuote({}, { nightUseAmountMinor: -1, additionalRoomAmountMinor: 180000, videokeRentalAmountMinor: 80000 })).toThrow(RangeError)
  })
})
