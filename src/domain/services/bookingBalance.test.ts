import type { BookingLineItem, BookingPayment, UUID } from '../models'
import { calculateBalanceDueMinor, calculateBookingTotalMinor, calculateNetPaymentsMinor } from './bookingBalance'

const lineItems: BookingLineItem[] = [{
  id: '00000000-0000-4000-8000-000000000001' as UUID,
  bookingId: '00000000-0000-4000-8000-000000000002' as UUID,
  kind: 'base_package',
  description: 'Night use',
  quantity: 1,
  unitAmountMinor: 590000,
  totalAmountMinor: 590000,
  createdAt: '2026-10-07T10:00:00.000Z',
}]

const payments: BookingPayment[] = [
  {
    id: '00000000-0000-4000-8000-000000000003' as UUID,
    bookingId: lineItems[0].bookingId,
    kind: 'payment',
    amountMinor: 200000,
    paidAt: '2026-10-07',
    method: 'GCash',
    transactionReference: null,
    notes: null,
    createdAt: '2026-10-07T10:00:00.000Z',
  },
  {
    id: '00000000-0000-4000-8000-000000000004' as UUID,
    bookingId: lineItems[0].bookingId,
    kind: 'refund',
    amountMinor: 50000,
    paidAt: '2026-10-07',
    method: 'GCash',
    transactionReference: null,
    notes: null,
    createdAt: '2026-10-07T10:00:00.000Z',
  },
]

describe('booking amount summaries', () => {
  it('calculates totals and treats refunds as reductions to payments', () => {
    expect(calculateBookingTotalMinor(lineItems)).toBe(590000)
    expect(calculateNetPaymentsMinor(payments)).toBe(150000)
    expect(calculateBalanceDueMinor(lineItems, payments)).toBe(440000)
  })

  it('preserves a negative balance when the booking is overpaid', () => {
    expect(calculateBalanceDueMinor(lineItems, [{ ...payments[0], amountMinor: 650000 }])).toBe(-60000)
  })
})
