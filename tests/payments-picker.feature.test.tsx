import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { addDays, format } from 'date-fns'
import PaymentsScreen from '../app/(tabs)/payments'
import type { BookingId } from '../src/domain/models'
import type { BookingAggregate } from '../src/domain/ports/BookingRepository'
import { bookingRepository } from '../src/data/repositories/bookingRepository'

let mockFocusCallback: (() => void | (() => void)) | undefined
let mockRequestedId: string | undefined

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ bookingId: mockRequestedId }),
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => { mockFocusCallback = callback },
}))

jest.mock('../src/data/repositories/bookingRepository', () => ({ bookingRepository: { listAll: jest.fn() } }))
jest.mock('../components/forms/PaymentEntryForm', () => {
  const { Text } = require('react-native')
  return { PaymentEntryForm: ({ bookingName }: { bookingName: string }) => <Text>Selected: {bookingName}</Text> }
})

function makeBooking(index: number, status: 'tentative' | 'confirmed' = 'confirmed'): BookingAggregate {
  const checkIn = addDays(new Date(2090, 0, 1), index)
  return {
    booking: {
      id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}` as BookingId,
      guestName: `Guest ${index + 1}`, address: null, cellphone: `+6391712345${String(index).padStart(2, '0')}`,
      email: null, checkInDate: format(checkIn, 'yyyy-MM-dd'), checkOutDate: format(addDays(checkIn, 1), 'yyyy-MM-dd'),
      notes: null, pax: 2, status, confirmationDepositAmountMinor: 100000,
      createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z', cancelledAt: null,
    }, lineItems: [], payments: [], activity: [],
  }
}

describe('Payments booking picker feature', () => {
  beforeEach(() => {
    mockFocusCallback = undefined
    mockRequestedId = undefined
    jest.mocked(bookingRepository.listAll).mockResolvedValue([makeBooking(0, 'tentative')])
  })

  it('shows a short upcoming list and searches the full booking history', async () => {
    jest.mocked(bookingRepository.listAll).mockResolvedValue(Array.from({ length: 12 }, (_, index) => makeBooking(index)))
    render(<PaymentsScreen />)
    act(() => { mockFocusCallback?.() })

    expect(await screen.findByText('Guest 1')).toBeTruthy()
    expect(screen.getByText('Showing 5 of 12 upcoming bookings. Search to find another booking.')).toBeTruthy()
    expect(screen.queryByText('Guest 6')).toBeNull()

    fireEvent.changeText(screen.getByLabelText('Search by guest, phone, or check-in date'), 'Guest 12')
    expect(screen.getByText('Guest 12')).toBeTruthy()
    expect(screen.queryByText('Guest 1')).toBeNull()
    fireEvent.press(screen.getByRole('button', { name: /Guest 12/ }))
    expect(screen.getByText('Selected: Guest 12')).toBeTruthy()
  })

  it('refreshes a booking status when Payments regains focus', async () => {
    render(<PaymentsScreen />)
    act(() => { mockFocusCallback?.() })
    expect(await screen.findByText('TENTATIVE')).toBeTruthy()

    jest.mocked(bookingRepository.listAll).mockResolvedValue([makeBooking(0, 'confirmed')])
    await act(async () => { mockFocusCallback?.() })

    await waitFor(() => expect(screen.getByText('CONFIRMED')).toBeTruthy())
    expect(bookingRepository.listAll).toHaveBeenCalledTimes(2)
  })
})
