import { render, screen } from '@testing-library/react-native'
import { calculateBookingQuote } from '../../src/domain/services/bookingQuote'
import { BookingQuoteSummary } from './BookingQuoteSummary'

describe('BookingQuoteSummary', () => {
  it('renders the itemized quote and calculated total', () => {
    const quote = calculateBookingQuote({
      includeSecondRoom: true,
      customItems: [{ kind: 'discount', description: 'Discount', quantity: 1, amountMinor: 50000 }],
    })
    render(<BookingQuoteSummary quote={quote} />)

    expect(screen.getByText('Price breakdown')).toBeTruthy()
    expect(screen.getByText('Night use')).toBeTruthy()
    expect(screen.getByText('Second room')).toBeTruthy()
    expect(screen.getByText('Videoke included with second room')).toBeTruthy()
    expect(screen.getByText('Discount')).toBeTruthy()
    expect(screen.getByText('₱7,200.00')).toBeTruthy()
  })
})
