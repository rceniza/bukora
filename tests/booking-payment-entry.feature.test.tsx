import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { PaymentEntryForm } from '../components/forms/PaymentEntryForm'
import type { BookingAggregate } from '../src/domain/ports/BookingRepository'
import type { BookingId, UUID } from '../src/domain/models'
import { bookingRepository } from '../src/data/repositories/bookingRepository'

jest.mock('../src/data/repositories/bookingRepository', () => ({
  bookingRepository: { findById: jest.fn(), addPayment: jest.fn() },
}))

const bookingId = '10000000-0000-4000-8000-000000000001' as BookingId
const record: BookingAggregate = {
  booking: {
    id: bookingId, guestName: 'Mia Cruz', address: null, cellphone: '+639171234567', email: null,
    checkInDate: '2026-11-01', checkOutDate: '2026-11-02', notes: null, pax: 0, status: 'confirmed', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', cancelledAt: null,
  },
  lineItems: [], payments: [], activity: [],
}

describe('booking-specific payment entry', () => {
  beforeEach(() => {
    jest.mocked(bookingRepository.findById).mockResolvedValue(record)
    jest.mocked(bookingRepository.addPayment).mockResolvedValue()
  })

  it('records a referenced payment against the selected booking and returns the updated record', async () => {
    const onRecorded = jest.fn()
    render(<PaymentEntryForm bookingId={bookingId} bookingName="Mia Cruz" onRecorded={onRecorded} />)

    fireEvent.changeText(screen.getByLabelText('Amount (PHP)'), '1250.00')
    fireEvent.press(screen.getByRole('button', { name: 'GCash' }))
    fireEvent.changeText(screen.getByLabelText('Transaction number / reference (optional)'), 'GC-2026-0091')
    fireEvent.press(screen.getByRole('button', { name: 'Record payment' }))

    await waitFor(() => expect(bookingRepository.addPayment).toHaveBeenCalledTimes(1))
    const [savedPayment] = jest.mocked(bookingRepository.addPayment).mock.calls[0]
    expect(savedPayment).toMatchObject({ bookingId, kind: 'payment', amountMinor: 125000, method: 'GCash', transactionReference: 'GC-2026-0091' })
    expect(onRecorded).toHaveBeenCalledWith(expect.objectContaining({ booking: record.booking, payments: [savedPayment] }))
    expect(await screen.findByText('Payment recorded.')).toBeTruthy()
  })

  it('uses the same booking context when recording a refund', async () => {
    jest.mocked(bookingRepository.findById).mockResolvedValue({
      ...record,
      payments: [{ id: '20000000-0000-4000-8000-000000000001' as UUID, bookingId, kind: 'payment', amountMinor: 200000, paidAt: '2026-10-01', method: 'Cash', transactionReference: null, notes: null, createdAt: '2026-10-01T10:00:00.000Z' }],
    })
    render(<PaymentEntryForm bookingId={bookingId} bookingName="Mia Cruz" />)

    fireEvent.press(screen.getByRole('button', { name: 'Refund' }))
    fireEvent.changeText(screen.getByLabelText('Amount (PHP)'), '500.00')
    fireEvent.press(screen.getByRole('button', { name: 'Record refund' }))

    await waitFor(() => expect(bookingRepository.addPayment).toHaveBeenCalledTimes(1))
    expect(jest.mocked(bookingRepository.addPayment).mock.calls[0][0]).toMatchObject({ bookingId, kind: 'refund', amountMinor: 50000 })
  })
})
