import { addDays, format } from 'date-fns'
import { fireEvent, render, screen } from '@testing-library/react-native'
import CalendarScreen from '../app/calendar'
import { bookingRepository } from '../src/data/repositories/bookingRepository'
import type { BookingAggregate } from '../src/domain/ports/BookingRepository'
import type { BookingId } from '../src/domain/models'

jest.mock('expo-router', () => ({ useRouter: () => ({ canGoBack: () => true, back: jest.fn(), replace: jest.fn(), push: jest.fn() }) }))
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))
jest.mock('../src/data/repositories/bookingRepository', () => ({ bookingRepository: { listAll: jest.fn() } }))

const today = format(new Date(), 'yyyy-MM-dd')
const checkout = format(addDays(new Date(), 1), 'yyyy-MM-dd')

function record(id: string, guestName: string, status: BookingAggregate['booking']['status']): BookingAggregate {
  return {
    booking: {
      id: id as BookingId, guestName, address: null, cellphone: '09171234567', email: null,
      checkInDate: today, checkOutDate: checkout, notes: null, pax: 2, status,
      confirmationDepositAmountMinor: 100000, createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z', cancelledAt: null,
    },
    lineItems: [], payments: [], activity: [],
  }
}

describe('full calendar availability feature', () => {
  beforeEach(() => {
    jest.mocked(bookingRepository.listAll).mockResolvedValue([
      record('10000000-0000-4000-8000-000000000001', 'Confirmed guest', 'confirmed'),
      record('10000000-0000-4000-8000-000000000002', 'Tentative guest', 'tentative'),
      record('10000000-0000-4000-8000-000000000003', 'Cancelled guest', 'cancelled'),
      record('10000000-0000-4000-8000-000000000004', 'Completed guest', 'completed'),
    ])
  })

  it('shows tentative and confirmed stays on occupied nights, excludes cancelled/completed, and frees checkout', async () => {
    render(<CalendarScreen />)

    expect(await screen.findByText('Confirmed guest')).toBeTruthy()
    expect(screen.getByText('Tentative guest')).toBeTruthy()
    expect(screen.queryByText('Cancelled guest')).toBeNull()
    expect(screen.queryByText('Completed guest')).toBeNull()

    fireEvent.press(screen.getByLabelText(format(addDays(new Date(), 1), 'MMMM d, yyyy')))
    expect(await screen.findByText('No stays on this day')).toBeTruthy()
  })
})
