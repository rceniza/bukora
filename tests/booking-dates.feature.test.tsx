import { addDays, format } from 'date-fns'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import NewBookingRoute from '../app/booking/new'
import { formatDisplayDate } from '../src/shared/utils/date'

jest.mock('expo-router', () => ({ useRouter: jest.fn() }))
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }))
jest.mock('../src/data/repositories/bookingRepository', () => ({
  bookingRepository: { findOverlaps: jest.fn().mockResolvedValue([]) },
}))

const mockedUseRouter = jest.mocked(useRouter)

describe('booking date selection', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ canGoBack: () => false, back: jest.fn(), replace: jest.fn() } as never)
  })

  it('moves checkout to the next night when check-in changes from a one-night default', () => {
    render(<NewBookingRoute />)
    const nextCheckIn = addDays(new Date(), 5)
    const checkInIso = format(nextCheckIn, 'yyyy-MM-dd')
    const nextCheckOut = format(addDays(nextCheckIn, 1), 'yyyy-MM-dd')

    fireEvent.press(screen.getByLabelText('Choose Check-in'))
    fireEvent.press(screen.getByLabelText(`Select ${format(nextCheckIn, 'MMMM d, yyyy')}`))

    expect(screen.getByText(formatDisplayDate(checkInIso))).toBeTruthy()
    expect(screen.getByText(formatDisplayDate(nextCheckOut))).toBeTruthy()
  })

  it('keeps the chosen multi-night duration when check-in changes', () => {
    render(<NewBookingRoute />)
    const longerCheckOut = addDays(new Date(), 3)
    const newCheckIn = addDays(new Date(), 7)
    const shiftedCheckOut = addDays(newCheckIn, 3)

    fireEvent.press(screen.getByLabelText('Choose Check-out'))
    fireEvent.press(screen.getByLabelText(`Select ${format(longerCheckOut, 'MMMM d, yyyy')}`))
    fireEvent.press(screen.getByLabelText('Choose Check-in'))
    fireEvent.press(screen.getByLabelText(`Select ${format(newCheckIn, 'MMMM d, yyyy')}`))

    expect(screen.getByText(formatDisplayDate(format(shiftedCheckOut, 'yyyy-MM-dd')))).toBeTruthy()
  })
})
