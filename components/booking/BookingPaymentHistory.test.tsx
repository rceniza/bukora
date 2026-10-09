import { fireEvent, render, screen } from '@testing-library/react-native'
import { BookingPaymentHistory } from './BookingPaymentHistory'
import type { BookingPayment, BookingId, UUID } from '../../src/domain/models'

const payments: BookingPayment[] = [
  { id: '30000000-0000-4000-8000-000000000001' as UUID, bookingId: '10000000-0000-4000-8000-000000000001' as BookingId, kind: 'payment', amountMinor: 200000, paidAt: '2026-10-01', method: 'GCash', transactionReference: 'GC-001', notes: null, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: '30000000-0000-4000-8000-000000000002' as UUID, bookingId: '10000000-0000-4000-8000-000000000001' as BookingId, kind: 'refund', amountMinor: 50000, paidAt: '2026-10-03', method: 'Cash', transactionReference: null, notes: 'Overpayment returned', createdAt: '2026-10-03T10:00:00.000Z' },
]

describe('BookingPaymentHistory', () => {
  it('shows payment and refund details and opens the contextual add action', () => {
    const onAddPayment = jest.fn()
    render(<BookingPaymentHistory payments={payments} onAddPayment={onAddPayment} />)

    expect(screen.getByText('Payment history')).toBeTruthy()
    expect(screen.getByText('2 entries')).toBeTruthy()
    expect(screen.getByText('GCash · Ref GC-001')).toBeTruthy()
    expect(screen.getByText('Overpayment returned')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'Add payment or refund' }))
    expect(onAddPayment).toHaveBeenCalledTimes(1)
  })

  it('explains when no payments or refunds have been recorded', () => {
    render(<BookingPaymentHistory payments={[]} onAddPayment={() => {}} />)

    expect(screen.getByText('No payments or refunds recorded yet.')).toBeTruthy()
    expect(screen.getByText('0 entries')).toBeTruthy()
  })
})
