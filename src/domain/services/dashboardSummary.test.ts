import type { BookingId, UUID } from '../models'
import type { DashboardBookingSnapshot, RecentPaymentActivity } from '../ports/DashboardRepository'
import { selectDashboardSummary } from './dashboardSummary'

function aggregate(id: string, date: string, status: DashboardBookingSnapshot['booking']['status'], total: number, paid = 0): DashboardBookingSnapshot {
  const bookingId = id as BookingId
  return {
    booking: {
      id: bookingId,
      status,
      guestName: `Guest ${id.slice(-1)}`,
      address: null,
      cellphone: '09171234567',
      email: null,
      pax: 4,
      checkInDate: date,
      checkOutDate: '2026-12-01',
      notes: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      cancelledAt: null,
    },
    lineItems: total ? [{
      id: '00000000-0000-4000-8000-000000000001' as UUID,
      bookingId,
      kind: 'base_package',
      description: 'Night use',
      quantity: 1,
      unitAmountMinor: total,
      totalAmountMinor: total,
      createdAt: '2026-10-01T00:00:00.000Z',
    }] : [],
    payments: paid ? [{
      id: '00000000-0000-4000-8000-000000000002' as UUID,
      bookingId,
      kind: 'payment',
      amountMinor: paid,
      paidAt: '2026-10-01',
      method: 'Cash',
      transactionReference: null,
      notes: null,
      createdAt: '2026-10-01T00:00:00.000Z',
    }] : [],
  }
}

describe('selectDashboardSummary', () => {
  const records = [
    aggregate('00000000-0000-4000-8000-000000000001', '2026-12-10', 'confirmed', 590000, 200000),
    aggregate('00000000-0000-4000-8000-000000000002', '2026-11-10', 'tentative', 770000),
    aggregate('00000000-0000-4000-8000-000000000003', '2026-09-10', 'completed', 500000, 500000),
    aggregate('00000000-0000-4000-8000-000000000004', '2026-12-20', 'cancelled', 590000),
  ]
  const payment: RecentPaymentActivity = {
    id: '00000000-0000-4000-8000-000000000005' as UUID,
    bookingId: records[0].booking.id,
    kind: 'payment',
    amountMinor: 200000,
    paidAt: '2026-10-07',
    method: 'GCash',
    transactionReference: 'TXN-123',
    notes: null,
    createdAt: '2026-10-07T10:00:00.000Z',
    guestName: 'Guest 1',
  }

  it('sorts upcoming bookings and calculates balances across active bookings only', () => {
    const summary = selectDashboardSummary(records, [payment], '2026-10-07')

    expect(summary.bookingCount).toBe(4)
    expect(summary.upcomingCount).toBe(2)
    expect(summary.upcomingBookings.map(({ id }) => id)).toEqual([records[1].booking.id, records[0].booking.id])
    expect(summary.upcomingBookings[1].balanceDueMinor).toBe(390000)
    expect(summary.totalBalanceDueMinor).toBe(1160000)
    expect(summary.recentPayments).toEqual([payment])
  })

  it('limits the visible upcoming list without losing the booking count', () => {
    const summary = selectDashboardSummary(records, [], '2026-10-07', 1)
    expect(summary.upcomingBookings).toHaveLength(1)
    expect(summary.bookingCount).toBe(4)
    expect(summary.upcomingCount).toBe(2)
  })
})
