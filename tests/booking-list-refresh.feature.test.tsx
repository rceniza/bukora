import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import BookingListScreen from '../app/(tabs)/booking'
import type { BookingAggregate } from '../src/domain/ports/BookingRepository'
import type { BookingId } from '../src/domain/models'
import { bookingRepository } from '../src/data/repositories/bookingRepository'

let mockFocusCallback: (() => void | (() => void)) | undefined

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => { mockFocusCallback = callback },
}))

jest.mock('../src/data/repositories/bookingRepository', () => ({
  bookingRepository: { listAll: jest.fn() },
}))

const record = (status: 'tentative' | 'cancelled'): BookingAggregate => ({
  booking: {
    id: '10000000-0000-4000-8000-000000000001' as BookingId, guestName: 'Mia Cruz', address: null,
    cellphone: '+639171234567', email: null, checkInDate: '2026-12-01', checkOutDate: '2026-12-02',
    notes: null, pax: 0, status, confirmationDepositAmountMinor: 100000,
    createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-01T10:00:00.000Z',
    cancelledAt: status === 'cancelled' ? '2026-10-09T10:00:00.000Z' : null,
  },
  lineItems: [], payments: [], activity: [],
})

describe('booking list refresh feature', () => {
  beforeEach(() => {
    mockFocusCallback = undefined
    jest.mocked(bookingRepository.listAll).mockResolvedValue([record('tentative')])
  })

  it('reloads status when the owner returns to the list after cancelling a booking', async () => {
    render(<BookingListScreen />)
    act(() => { mockFocusCallback?.() })
    expect(await screen.findByText('tentative')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'All' }))

    jest.mocked(bookingRepository.listAll).mockResolvedValue([record('cancelled')])
    await act(async () => { mockFocusCallback?.() })

    await waitFor(() => expect(screen.getByText('cancelled')).toBeTruthy())
    expect(bookingRepository.listAll).toHaveBeenCalledTimes(2)
  })
})
